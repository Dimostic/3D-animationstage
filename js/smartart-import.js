/* ============================================
   SmartArt Import Tool
   Parses pasted text or table data (TSV/CSV
   from Excel / Sheets / Word), infers the
   structural intent (list, process, hierarchy,
   comparison, cycle, numeric, etc.), and
   suggests matching SmartArt templates. The
   user can apply a suggestion or force any
   template from the catalog.
   ============================================ */

class SmartArtImport {
    constructor(manager) {
        if (!manager) throw new Error('SmartArtImport requires a SmartArtManager');
        this.manager = manager;
        this.templates = manager.templates;

        this.elInput = document.getElementById('sa-import-input');
        this.elDetect = document.getElementById('sa-import-detect');
        this.elClear = document.getElementById('sa-import-clear');
        this.elSummary = document.getElementById('sa-import-summary');
        this.elSuggestions = document.getElementById('sa-import-suggestions');
        this.elSelect = document.getElementById('sa-import-template');
        this.elApplyForced = document.getElementById('sa-import-apply-forced');
        this.elOutlineToolbar = document.querySelector('.sa-import-outline-toolbar');

        this._lastParse = null;
        this._populateTemplateDropdown();
        this._bindEvents();
    }

    /* ---------- UI wiring ---------- */

    _populateTemplateDropdown() {
        if (!this.elSelect) return;
        // Group by category for readability
        const byCat = new Map();
        this.templates.templates.forEach(t => {
            if (!byCat.has(t.category)) byCat.set(t.category, []);
            byCat.get(t.category).push(t);
        });
        const catNames = new Map((this.templates.categories || []).map(c => [c.id, c.name]));
        const frag = document.createDocumentFragment();
        // Keep the placeholder option that already exists
        Array.from(byCat.keys()).sort().forEach(catId => {
            const group = document.createElement('optgroup');
            group.label = catNames.get(catId) || catId;
            byCat.get(catId)
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .forEach(tpl => {
                    const opt = document.createElement('option');
                    opt.value = tpl.id;
                    opt.textContent = tpl.name;
                    group.appendChild(opt);
                });
            frag.appendChild(group);
        });
        this.elSelect.appendChild(frag);
    }

    _bindEvents() {
        this.elDetect?.addEventListener('click', () => this._runDetect());
        this.elClear?.addEventListener('click', () => {
            if (this.elInput) this.elInput.value = '';
            this._renderSummary(null);
            this._renderSuggestions([]);
        });
        this.elInput?.addEventListener('keydown', (e) => {
            // Cmd/Ctrl + Enter triggers detect for power users
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                this._runDetect();
                return;
            }
            this._handleOutlineKeydown(e);
        });
        this.elInput?.addEventListener('paste', (e) => this._handleOutlinePaste(e));
        this.elOutlineToolbar?.addEventListener('mousedown', (e) => {
            if (e.target.closest('button[data-outline-action]')) e.preventDefault();
        });
        this.elOutlineToolbar?.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-outline-action]');
            if (!button) return;
            const action = button.dataset.outlineAction;
            if (action === 'bullets') this._setSelectedListStyle('bullet');
            if (action === 'numbering') this._setSelectedListStyle('number');
            if (action === 'indent') this._adjustSelectedIndent(1);
            if (action === 'outdent') this._adjustSelectedIndent(-1);
            if (action === 'plain') this._setSelectedListStyle('plain');
        });
        this.elApplyForced?.addEventListener('click', () => {
            const id = this.elSelect?.value;
            if (!id) {
                this._toast('Pick a template first', 'warning');
                return;
            }
            const parsed = this._lastParse || this._parse(this.elInput?.value || '');
            this._applyTemplate(id, parsed.items);
        });
    }

    _handleOutlineKeydown(e) {
        if (!this.elInput) return;
        if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            this._adjustSelectedIndent(e.shiftKey ? -1 : 1);
            return;
        }
        if (e.key !== 'Enter' || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
        const value = this.elInput.value;
        const caret = this.elInput.selectionStart;
        if (caret !== this.elInput.selectionEnd) return;
        const lineStart = value.lastIndexOf('\n', Math.max(0, caret - 1)) + 1;
        const beforeCaret = value.slice(lineStart, caret);
        const parsed = this._splitOutlineLine(beforeCaret);
        if (!parsed.marker) return;
        e.preventDefault();
        if (!parsed.body.trim()) {
            const replacement = parsed.indent.length >= 2 ? parsed.indent.slice(0, -2) : '';
            this.elInput.setRangeText(replacement, lineStart, caret, 'end');
            return;
        }
        const nextMarker = /^\d+[.)]$/.test(parsed.marker)
            ? `${parseInt(parsed.marker, 10) + 1}${parsed.marker.slice(-1)}`
            : parsed.marker;
        this.elInput.setRangeText(`\n${parsed.indent}${nextMarker} `, caret, caret, 'end');
    }

    _selectedLineRange() {
        const input = this.elInput;
        const value = input?.value || '';
        const selectionStart = input?.selectionStart || 0;
        const selectionEnd = input?.selectionEnd || selectionStart;
        const start = value.lastIndexOf('\n', Math.max(0, selectionStart - 1)) + 1;
        let end = value.indexOf('\n', selectionEnd);
        if (end < 0) end = value.length;
        return { value, start, end, selectionStart, selectionEnd };
    }

    _replaceSelectedLines(transform) {
        if (!this.elInput) return;
        const range = this._selectedLineRange();
        const source = range.value.slice(range.start, range.end);
        const lines = source.split('\n');
        const replacement = lines.map((line, index) => transform(line, index, lines)).join('\n');
        this.elInput.setRangeText(replacement, range.start, range.end, 'select');
        this.elInput.focus();
        this.elInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    _splitOutlineLine(line) {
        const match = String(line || '').match(/^(\s*)((?:(?:\d+|[A-Za-z]|[ivxlcdmIVXLCDM]+)[.)])|[-–—*+•·●○◦▪▫■□‣⁃▶►➤✓✔☑✅☐☒✗✘])(?:\s+|$)(.*)$/);
        return match
            ? { indent: match[1], marker: match[2], body: match[3] }
            : { indent: (String(line || '').match(/^\s*/) || [''])[0], marker: '', body: String(line || '').replace(/^\s*/, '') };
    }

    _setSelectedListStyle(style) {
        let number = 0;
        this._replaceSelectedLines(line => {
            if (!line.trim()) return line;
            const parsed = this._splitOutlineLine(line);
            if (style === 'plain') return `${parsed.indent}${parsed.body}`;
            if (style === 'number') {
                number += 1;
                return `${parsed.indent}${number}. ${parsed.body}`;
            }
            return `${parsed.indent}• ${parsed.body}`;
        });
    }

    _adjustSelectedIndent(direction) {
        this._replaceSelectedLines(line => {
            if (!line.trim()) return line;
            if (direction > 0) return `  ${line}`;
            if (line.startsWith('\t')) return line.slice(1);
            const spaces = (line.match(/^ +/) || [''])[0].length;
            return line.slice(Math.min(2, spaces));
        });
    }

    _handleOutlinePaste(e) {
        if (!this.elInput || !e.clipboardData) return;
        const html = e.clipboardData.getData('text/html');
        const plain = e.clipboardData.getData('text/plain');
        const converted = html ? this._outlineFromClipboardHtml(html) : '';
        const normalized = converted || this._normalizePastedOutlineText(plain);
        if (!normalized || normalized === plain) return;
        e.preventDefault();
        this.elInput.setRangeText(normalized, this.elInput.selectionStart, this.elInput.selectionEnd, 'end');
        this.elInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    _normalizePastedOutlineText(text) {
        return String(text || '')
            .replace(/\r\n?/g, '\n')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/\u00a0/g, ' ')
            .replace(/^([\t ]*)[\uF0B7\uF0A7\uF0D8]\s*/gm, '$1• ');
    }

    _outlineFromClipboardHtml(html) {
        let doc;
        try { doc = new DOMParser().parseFromString(html, 'text/html'); } catch (_) { return ''; }
        if (!doc?.body || doc.querySelector('table')) return '';

        const wordItems = Array.from(doc.querySelectorAll('p, div')).filter(el =>
            /mso-list/i.test(el.getAttribute('style') || '') || /MsoList/i.test(el.className || '')
        );
        if (wordItems.length >= 2) {
            const counters = [];
            const lines = wordItems.map(el => {
                const style = el.getAttribute('style') || '';
                const levelMatch = style.match(/level(\d+)/i);
                const marginMatch = style.match(/margin-left:\s*([\d.]+)pt/i);
                const level = levelMatch ? Math.max(0, parseInt(levelMatch[1], 10) - 1)
                    : marginMatch ? Math.max(0, Math.round(parseFloat(marginMatch[1]) / 36) - 1) : 0;
                let body = this._cleanClipboardItemText(el.textContent);
                const ordered = /^\s*\d+[.)]/.test(body);
                body = body.replace(/^\s*(?:\d+[.)]|[\uF0B7\uF0A7\uF0D8•·●○◦▪▫■□‣⁃▶►➤])\s*/, '');
                counters[level] = (counters[level] || 0) + 1;
                counters.length = level + 1;
                const marker = ordered ? `${counters[level]}.` : '•';
                return `${'  '.repeat(level)}${marker} ${body}`;
            }).filter(line => line.trim());
            if (lines.length) return lines.join('\n');
        }

        if (!doc.querySelector('ul, ol')) return '';
        const lines = [];
        const appendList = (list, depth) => {
            const ordered = list.tagName === 'OL';
            let counter = parseInt(list.getAttribute('start') || '1', 10);
            Array.from(list.children).filter(child => child.tagName === 'LI').forEach(li => {
                const textParts = Array.from(li.childNodes)
                    .filter(node => !(node.nodeType === 1 && /^(UL|OL)$/.test(node.tagName)))
                    .map(node => node.textContent || '');
                const body = this._cleanClipboardItemText(textParts.join(' '));
                if (body) lines.push(`${'  '.repeat(depth)}${ordered ? `${counter}.` : '•'} ${body}`);
                if (ordered) counter += 1;
                Array.from(li.children).filter(child => /^(UL|OL)$/.test(child.tagName)).forEach(nested => appendList(nested, depth + 1));
            });
        };
        let hasLeadingBlock = false;
        Array.from(doc.body.children).forEach(node => {
            if (/^(UL|OL)$/.test(node.tagName)) {
                appendList(node, hasLeadingBlock ? 1 : 0);
                hasLeadingBlock = false;
                return;
            }
            const directLists = Array.from(node.children || []).filter(child => /^(UL|OL)$/.test(child.tagName));
            const text = this._cleanClipboardItemText(Array.from(node.childNodes)
                .filter(child => !(child.nodeType === 1 && /^(UL|OL)$/.test(child.tagName)))
                .map(child => child.textContent || '').join(' '));
            if (text) {
                lines.push(text);
                hasLeadingBlock = true;
            }
            directLists.forEach(list => appendList(list, text ? 1 : 0));
            if (directLists.length) hasLeadingBlock = false;
        });
        return lines.join('\n');
    }

    _cleanClipboardItemText(text) {
        return String(text || '')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/\u00a0/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    _toast(message, type = 'info') {
        try {
            if (window.Utils && Utils.showToast) Utils.showToast(message, type);
        } catch (_) { /* ignore */ }
    }

    _runDetect() {
        const raw = (this.elInput?.value || '').trim();
        if (!raw) {
            this._toast('Paste some text or a table first', 'warning');
            this._renderSummary(null);
            this._renderSuggestions([]);
            return;
        }
        const parsed = this._parse(raw);
        this._lastParse = parsed;
        if (!parsed.items.length) {
            this._renderSummary({ ...parsed, error: 'Could not detect any items. Try one item per line, or a table with rows of values.' });
            this._renderSuggestions([]);
            return;
        }
        const suggestions = this._suggest(parsed);
        this._renderSummary(parsed);
        this._renderSuggestions(suggestions);
    }

    /* =========================================
       Parser
       Returns: {
         items: [{ text, subtext?, value? }],
         structure: {
           source: 'text' | 'table',
           rows, columns,
           hasNumbers, numericRatio,
           hasArrows, hasComparison,
           hasHierarchy, maxDepth,
           keywordHint: string|null,
           rawText: string
         }
       }
       ========================================= */

    _parse(raw) {
        const text = String(raw || '');
        const lower = text.toLowerCase();

        // ---- Detect table (TSV / CSV / Markdown) ----
        const lines = text.split(/\r?\n/).map(l => l.replace(/\u00a0/g, ' ')).filter(l => l.trim().length);
        const looksLikeOutline = this._looksLikeBulletedOutline(lines);
        const tableInfo = looksLikeOutline ? null : this._tryParseTable(lines);
        if (tableInfo) {
            return this._buildTableResult(tableInfo, lower);
        }

        const flatTableInfo = looksLikeOutline ? null : this._tryParseFlatTable(lines);
        if (flatTableInfo) {
            return this._buildTableResult(flatTableInfo, lower);
        }

        // ---- Single-line comma-separated quantitative list ----
        // e.g. "Nigeria-234, South Africa-34, USA-90" or "Peru: 70%, USA: 40%"
        if (lines.length === 1) {
            const frameworkInline = this._tryParseKnownFrameworkInline(lines[0], lower);
            if (frameworkInline) {
                return this._buildTextResult(text, lower, frameworkInline);
            }

            const single = this._tryParseInlineList(lines[0]);
            if (single) {
                return this._buildInlineListResult(single, lower);
            }

            const plainInline = this._tryParsePlainInlineList(lines[0]);
            if (plainInline) {
                return this._buildTextResult(text, lower, plainInline);
            }
        }

        // ---- Alternating label / value lines (pasted 2-column data) ----
        // e.g.
        //   South Africa
        //   75%
        //   Peru
        //   65% (60–70%)
        // The detector pairs consecutive non-numeric label lines with the
        // following numeric line, optionally skipping a 2-line header.
        const paired = this._tryParseAlternatingLines(lines);
        if (paired) {
            return this._buildInlineListResult(paired, lower);
        }

        // ---- Otherwise: line-based text ----
        return this._buildTextResult(text, lower, lines);
    }

    _looksLikeBulletedOutline(lines) {
        if (!Array.isArray(lines) || lines.length < 2) return false;
        const marker = /^\s*(?:(?:\d+|[A-Za-z]|[ivxlcdmIVXLCDM]+)[.)]|[•·●○◦▪▫■□‣⁃▶►➤✓✔☑✅☐☒✗✘])\s*|^\s*[-–—*+]\s+/;
        const matches = lines.filter(line => marker.test(line)).length;
        return matches >= 2 && matches / lines.length >= 0.5;
    }

    _tryParseKnownFrameworkInline(line, lower) {
        const source = String(line || '').replace(/\s+/g, ' ').trim();
        if (!source) return null;

        const frameworks = [
            {
                hint: 'pestle',
                title: /\bpestle\s+analysis\b/i,
                labels: ['Political', 'Economic', 'Social', 'Technological', 'Legal', 'Environmental']
            },
            {
                hint: 'swot',
                title: /\bswot\s+analysis\b/i,
                labels: ['Strengths', 'Weaknesses', 'Opportunities', 'Threats']
            },
            {
                hint: 'benchmarking',
                title: /\bbenchmarking\b/i,
                labels: []
            }
        ];

        const matches = frameworks
            .map(fw => {
                const match = source.match(fw.title);
                return match ? { ...fw, index: match.index ?? -1 } : null;
            })
            .filter(Boolean)
            .sort((a, b) => a.index - b.index);
        if (!matches.length) return null;

        const lines = [];
        const primary = matches[0];
        const next = matches[1];
        const section = source.slice(primary.index, next ? next.index : source.length).trim();
        if (!section) return null;

        if (primary.hint === 'benchmarking') {
            const cleaned = section.replace(primary.title, '').replace(/^\s*[-:]\s*/, '').trim();
            const compared = cleaned.replace(/^compared\s+with\s*:?\s*/i, '').trim();
            const names = compared
                ? compared.split(/\s{2,}|[,;]|\band\b/i).map(s => s.trim()).filter(Boolean)
                : [];
            lines.push('Benchmarking');
            if (names.length > 1) {
                names.forEach(name => lines.push(name));
            } else if (compared) {
                // Compact pasted institution names are often just space separated.
                lines.push(compared);
            }
            return lines.length >= 2 ? lines : null;
        }

        const found = primary.labels.filter(label => new RegExp(`\\b${label}\\b`, 'i').test(section));
        if (found.length >= Math.max(2, Math.floor(primary.labels.length * 0.5))) {
            lines.push(...found);
        } else {
            lines.push(section.replace(primary.title, '').trim() || primary.hint.toUpperCase());
        }

        return lines.length >= 2 ? lines : null;
    }

    _lineHasLeadingNumber(line) {
        // True if the line starts with a numeric token (optional sign, digits,
        // optional decimal, optional %), allowing surrounding whitespace.
        return /^\s*-?\d+(?:\.\d+)?\s*%?(?:\s|$|[\(\[])/.test(String(line || ''));
    }

    _tryParseAlternatingLines(lines) {
        if (!Array.isArray(lines) || lines.length < 4) return null;
        // Optionally drop a header pair (two leading lines that are both
        // non-numeric and look like column titles).
        let work = lines.slice();
        if (work.length >= 6
            && !this._lineHasLeadingNumber(work[0])
            && !this._lineHasLeadingNumber(work[1])
            && this._lineHasLeadingNumber(work[3])) {
            // Heuristic: lines 0,1 are headers; line 2 is first label, line 3 is first value
            work = work.slice(2);
        }
        if (work.length < 4 || work.length % 2 !== 0) {
            // Try dropping a single header line
            if (work.length >= 5 && (work.length - 1) % 2 === 0
                && !this._lineHasLeadingNumber(work[0])
                && !this._lineHasLeadingNumber(work[1])
                && this._lineHasLeadingNumber(work[2])) {
                work = work.slice(1);
            } else {
                return null;
            }
        }
        // Verify the alternating pattern: even index = label (no leading number),
        // odd index = value (starts with a number). Allow up to 1 mismatched pair
        // to be forgiving of stray rows.
        let pairs = 0;
        let mismatches = 0;
        for (let i = 0; i + 1 < work.length; i += 2) {
            const label = work[i];
            const value = work[i + 1];
            const labelOk = !this._lineHasLeadingNumber(label) && /[a-z]/i.test(label);
            const valueOk = this._lineHasLeadingNumber(value);
            if (labelOk && valueOk) pairs += 1;
            else mismatches += 1;
        }
        if (pairs < 2 || pairs < mismatches * 2) return null;
        // Build items
        const items = [];
        for (let i = 0; i + 1 < work.length; i += 2) {
            const label = String(work[i] || '').trim();
            const valueLine = String(work[i + 1] || '').trim();
            if (!label) continue;
            const value = this._extractAnyNumber(valueLine);
            const item = { text: label, subtext: valueLine };
            if (value != null) item.value = value;
            items.push(item);
        }
        return items.length >= 2 ? items : null;
    }

    _tryParseInlineList(line) {
        const segments = line.split(/[,;]\s*/).map(s => s.trim()).filter(Boolean);
        if (segments.length < 2) return null;
        // Strip a leading prose lead-in like "Participants per region- " before the first segment
        // by detecting an em/en/hyphen that separates a longish prose label from the data.
        const firstSeg = segments[0];
        const leadMatch = firstSeg.match(/^(.*?[a-z]{4,}.*?)[\-\u2013\u2014:]\s*(.+)$/i);
        const leadPrefix = leadMatch ? leadMatch[1].trim() : '';
        const leadSuffix = leadMatch ? leadMatch[2].trim() : '';
        const leadWordCount = leadPrefix ? leadPrefix.split(/\s+/).filter(Boolean).length : 0;
        const suffixLooksLikeData = !!this._parseInlineSegment(leadSuffix);
        if (leadMatch && !this._extractAnyNumber(leadPrefix) && leadWordCount >= 3 && suffixLooksLikeData) {
            // Replace first segment with the part after the lead-in
            segments[0] = leadSuffix;
        }
        // Each segment must look like "Label-value", "Label: value", "Label (value)", or "Label value".
        let withNumeric = 0;
        const items = segments.map(seg => this._parseInlineSegment(seg)).filter(Boolean);
        items.forEach(it => { if (it.value != null) withNumeric++; });
        if (items.length < 2) return null;
        // Require at least 60% to have numeric values for an inline quantitative list
        if (withNumeric / items.length < 0.6) return null;
        return items;
    }

    _tryParsePlainInlineList(line) {
        const segments = String(line || '')
            .split(/[,;]\s*/)
            .map(s => s.trim())
            .filter(Boolean);
        if (segments.length < 2) return null;

        // Avoid splitting prose sentences that just happen to contain commas.
        const looksLikeSentence = /[.!?]\s*$/.test(line)
            || segments.some(seg => seg.split(/\s+/).filter(Boolean).length > 6);
        if (looksLikeSentence) return null;

        return segments;
    }

    _parseInlineSegment(seg) {
        // Try "Label (~value%)" / "Label (value)"
        const paren = seg.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
        if (paren) {
            const text = paren[1].trim();
            const value = this._extractAnyNumber(paren[2]);
            if (text && value != null) return { text, subtext: paren[2].trim(), value };
        }
        // Try "Label: value" or "Label - value" / "Label \u2013 value" / "Label = value"
        const sep = seg.match(/^(.+?)\s*[:\-\u2013\u2014=]\s*(.+)$/);
        if (sep) {
            const text = sep[1].trim();
            const valueRaw = sep[2].trim();
            const value = this._extractAnyNumber(valueRaw);
            if (text) return value != null
                ? { text, subtext: valueRaw, value }
                : { text, subtext: valueRaw };
        }
        // Try "Label value" with trailing number
        const trailing = this._extractTrailingNumber(seg);
        if (trailing != null) {
            const text = seg.replace(/[\s\-:=\u2013\u2014]*-?\d+(?:\.\d+)?\s*%?\s*$/, '').trim();
            if (text) return { text, subtext: String(trailing), value: trailing };
        }
        // Plain qualitative item
        const cleaned = seg.trim();
        return cleaned ? { text: cleaned } : null;
    }

    _buildInlineListResult(items, lower) {
        const numericCount = items.filter(it => it.value != null).length;
        const structure = {
            source: 'inline',
            rows: items.length,
            columns: 2,
            hasNumbers: numericCount > 0,
            numericRatio: items.length ? numericCount / items.length : 0,
            hasArrows: false,
            hasComparison: false,
            hasHierarchy: false,
            maxDepth: 1,
            keywordHint: this._detectKeywordHint(lower),
            headers: null,
            separator: 'inline',
            rawText: ''
        };
        return { items, structure };
    }

    _tryParseTable(lines) {
        if (lines.length < 2) return null; // need at least 2 rows to be a table

        // Markdown table: every row starts and ends with `|` and there is a `|---|---|` separator row.
        const isMd = lines.every(l => /^\s*\|.*\|\s*$/.test(l)) && lines.some(l => /^\s*\|?[\s:|\-]+\|?\s*$/.test(l) && /-{2,}/.test(l));
        if (isMd) {
            const cleaned = lines
                .filter(l => !/^\s*\|?[\s:|\-]+\|?\s*$/.test(l) || !/-{2,}/.test(l)) // drop separator row(s)
                .map(l => l.trim().replace(/^\|/, '').replace(/\|$/, ''));
            const rows = cleaned.map(l => l.split('|').map(c => c.trim()));
            const maxCols = Math.max(...rows.map(r => r.length));
            if (maxCols >= 2) {
                const norm = rows.map(r => { while (r.length < maxCols) r.push(''); return r; });
                return { rows: norm, columns: maxCols, separator: 'markdown' };
            }
        }

        const candidates = [
            { sep: '\t', name: 'tab' },
            { sep: ',', name: 'comma' },
            { sep: /\s{2,}/, name: 'whitespace' },
            { sep: '|', name: 'pipe' },
            { sep: ';', name: 'semicolon' }
        ];
        for (const c of candidates) {
            const rows = lines.map(l => this._splitRow(l, c.sep));
            const colCounts = rows.map(r => r.length);
            const maxCols = Math.max(...colCounts);
            const minCols = Math.min(...colCounts);
            // Require multi-column on majority of rows
            if (maxCols < 2) continue;
            const multi = colCounts.filter(n => n >= 2).length;
            if (multi < Math.max(2, Math.floor(rows.length * 0.6))) continue;
            // Avoid false-positive on commas inside prose: ensure column count is consistent
            if (c.name === 'comma' && (maxCols - minCols) > 1) continue;
            // Normalize to maxCols
            const norm = rows.map(r => {
                while (r.length < maxCols) r.push('');
                return r.map(cell => cell.trim());
            });
            return { rows: norm, columns: maxCols, separator: c.name };
        }
        return null;
    }

    _tryParseFlatTable(lines) {
        if (!Array.isArray(lines) || lines.length < 9) return null;

        const headerHints = /(start|end|value|day|week|date|amount|score|count|total|percent|qty|quantity|cost|price|duration)/i;
        for (let columns = Math.min(4, Math.floor(lines.length / 3)); columns >= 3; columns--) {
            const headers = lines.slice(0, columns).map(v => String(v || '').trim());
            const body = lines.slice(columns).map(v => String(v || '').trim());
            if (!headers.every(Boolean) || headers.some(h => this._isNumeric(h))) continue;
            if (body.length < columns * 2 || body.length % columns !== 0) continue;

            const rows = [];
            for (let index = 0; index < body.length; index += columns) {
                rows.push(body.slice(index, index + columns));
            }
            if (rows.length < 2) continue;

            const firstColText = rows.filter(r => r[0] && !this._isNumeric(r[0])).length;
            if (firstColText < Math.ceil(rows.length * 0.8)) continue;

            let numericCells = 0;
            let valueCells = 0;
            rows.forEach(row => {
                row.slice(1).forEach(cell => {
                    valueCells += 1;
                    if (this._extractAnyNumber(cell) != null) numericCells += 1;
                });
            });

            const hintedHeaders = headers.slice(1).some(h => headerHints.test(h));
            if (!hintedHeaders && (valueCells === 0 || (numericCells / valueCells) < 0.6)) continue;

            return {
                rows: [headers, ...rows],
                columns,
                separator: 'flat-lines'
            };
        }
        return null;
    }

    _splitRow(line, sep) {
        if (sep instanceof RegExp) {
            return line.split(sep);
        }
        // Simple split — does not support quoted CSV with embedded separators (rare in pasted data).
        return line.split(sep);
    }

    _buildTableResult(table, lower) {
        const { rows, columns } = table;

        // For Markdown tables, the first row is always the header.
        const mdHeader = table.separator === 'markdown' && rows.length >= 2;

        // Detect header row (first row all non-numeric while subsequent rows include numeric)
        const looksLikeHeader = mdHeader || (() => {
            if (rows.length < 2) return false;
            const firstNumeric = rows[0].filter(c => this._isNumeric(c)).length;
            const restNumeric = rows.slice(1).reduce((acc, r) => acc + r.filter(c => this._isNumeric(c)).length, 0);
            return firstNumeric === 0 && restNumeric > 0;
        })();

        const dataRows = looksLikeHeader ? rows.slice(1) : rows;
        const headers = looksLikeHeader ? rows[0] : null;

        // Build items: text = first column, subtext/value = remaining numeric or joined text
        const items = dataRows.map(r => {
            const text = (r[0] || '').trim() || `Item`;
            if (columns === 1) return { text };
            // Capture every numeric cell after the first column. Some templates
            // (e.g. Gantt: start/end days) need both numbers, not just the first.
            let value = null;
            const values = [];
            const restCols = r.slice(1);
            for (const cell of restCols) {
                const num = this._extractAnyNumber(cell);
                if (num != null) {
                    values.push(num);
                    if (value == null) value = num;
                }
            }
            const subtext = restCols.filter(Boolean).join(' · ').trim() || (value != null ? String(value) : '');
            const item = { text };
            if (subtext) item.subtext = subtext;
            if (value != null) item.value = value;
            if (values.length > 1) item.values = values;
            // Preserve the raw remaining cells so date-aware templates
            // (e.g. Gantt) can re-parse strings like "2026-01-15" or "Jan 15".
            if (restCols.length) item.cells = restCols.map(c => String(c == null ? '' : c).trim());
            return item;
        }).filter(it => it.text);

        const numericCount = items.filter(it => it.value != null).length;
        const structure = {
            source: 'table',
            rows: dataRows.length,
            columns,
            hasNumbers: numericCount > 0,
            numericRatio: items.length ? numericCount / items.length : 0,
            hasArrows: false,
            hasComparison: columns === 2 && headers ? /vs|versus|compare/i.test(headers.join(' ')) : false,
            hasHierarchy: false,
            maxDepth: 1,
            keywordHint: this._detectKeywordHint(lower),
            headers,
            separator: table.separator,
            rawText: ''
        };
        return { items, structure };
    }

    _buildTextResult(rawText, lower, lines) {
        // ---- Arrow chains: split by →, ↓, ↑, ←, ->, =>, ⇒, etc. ----
        // We accept inline arrow tokens (between text on the same line) AND
        // arrow-only separator lines (e.g. "↓" on its own line between steps).
        const ARROW_CHARS = '→↓↑←⇒⇩⇧⇦⇨⬇⬆⬅⬄▼▲◀»';
        const inlineArrowRegex = new RegExp(`\\s*(?:[${ARROW_CHARS}]|->|=>|<-|<=)\\s*`, 'g');
        const arrowOnlyLineRegex = new RegExp(`^\\s*(?:[${ARROW_CHARS}]|->|=>|<-|<=)+\\s*$`);

        // Strip arrow-only separator lines and remember whether any were found.
        let arrowOnlyCount = 0;
        const cleanedLines = lines.filter(l => {
            if (arrowOnlyLineRegex.test(l)) { arrowOnlyCount += 1; return false; }
            return true;
        });
        const hasInlineArrows = inlineArrowRegex.test(rawText);
        inlineArrowRegex.lastIndex = 0;
        const hasArrows = hasInlineArrows || arrowOnlyCount > 0;

        let items = [];
        let maxDepth = 1;
        let hasHierarchy = false;

        if (hasInlineArrows && cleanedLines.length <= 3) {
            // Treat the whole block as an inline arrow chain
            const flat = cleanedLines.join(' ');
            items = flat
                .split(inlineArrowRegex)
                .map(s => s.trim())
                .filter(Boolean)
                .map(s => this._parseTextItem(s));
        } else {
            // Per-line items with optional indentation for hierarchy.
            // We use the cleaned line list so arrow-only separator lines have
            // already been removed and don't show up as bogus "items".
            const parsed = this._normalizeOutline(cleanedLines.map(l => this._parseLine(l)));
            hasHierarchy = parsed.some(p => p.depth > 0);
            maxDepth = parsed.reduce((m, p) => Math.max(m, p.depth + 1), 1);
            items = parsed.map((p, index) => {
                const item = this._parseTextItem(p.body);
                item._depth = p.depth;
                item._parentIndex = p.parentIndex;
                if (p.marker) item._bulletMarker = p.marker;
                if (p.bulletType) item._bulletType = p.bulletType;
                item._outlineIndex = index;
                return item;
            });
        }

        // De-dup empty items
        items = items.filter(it => it && it.text);

        const numericCount = items.filter(it => it.value != null).length;
        const hasComparison = /\b(vs|versus|compared to|against)\b/.test(lower) || (items.length === 2 && /\b(pros?|cons?|advantage|disadvantage)\b/.test(lower));

        const structure = {
            source: 'text',
            rows: items.length,
            columns: 1,
            hasNumbers: numericCount > 0,
            numericRatio: items.length ? numericCount / items.length : 0,
            hasArrows,
            hasComparison,
            hasHierarchy,
            maxDepth,
            hasBullets: items.some(item => item._bulletType),
            bulletCount: items.filter(item => item._bulletType).length,
            isChecklist: items.filter(item => item._bulletType === 'check').length >= Math.max(1, Math.ceil(items.length * 0.5)),
            isNumberedOutline: items.filter(item => item._bulletType === 'number').length >= Math.max(2, Math.ceil(items.length * 0.5)),
            rootCount: items.filter(item => (item._depth || 0) === 0).length,
            keywordHint: this._detectKeywordHint(lower),
            headers: null,
            rawText
        };
        return { items, structure };
    }

    _parseLine(line) {
        // Preserve indentation and marker style; depth is normalized across the whole outline later.
        const m = line.match(/^([\t ]*)(.*)$/);
        const lead = m ? m[1] : '';
        let body = m ? m[2] : line;
        const markerMatch = body.match(/^((?:\d+|[A-Za-z]|[ivxlcdmIVXLCDM]+)[.)]|[-–—*+•·●○◦▪▫■□‣⁃▶►➤✓✔☑✅☐☒✗✘])\s*/);
        const marker = markerMatch ? markerMatch[1] : '';
        if (markerMatch) body = body.slice(markerMatch[0].length);
        const columns = Array.from(lead).reduce((count, ch) => ch === '\t' ? count + 4 : count + 1, 0);
        return {
            indentColumns: columns,
            body,
            marker,
            bulletType: this._classifyBulletMarker(marker),
            markerRank: this._bulletMarkerRank(marker)
        };
    }

    _classifyBulletMarker(marker) {
        if (!marker) return null;
        if (/^[✓✔☑✅☐☒✗✘]$/.test(marker)) return 'check';
        if (/^(?:\d+|[A-Za-z]|[ivxlcdmIVXLCDM]+)[.)]$/.test(marker)) return 'number';
        return 'bullet';
    }

    _bulletMarkerRank(marker) {
        if (!marker) return 0;
        if (/^[◦○▫□]$/.test(marker)) return 1;
        if (/^[▪‣⁃]$/.test(marker)) return 2;
        if (/^[a-z][.)]$/.test(marker)) return 1;
        if (/^(?:[ivxlcdm]+)[.)]$/i.test(marker) && marker.replace(/[.)]/g, '').length > 1) return 2;
        return 0;
    }

    _normalizeOutline(lines) {
        if (!lines.length) return [];
        const indentValues = Array.from(new Set(lines.map(line => line.indentColumns))).sort((a, b) => a - b);
        const baseIndent = indentValues[0] || 0;
        const indents = indentValues.filter(value => value > baseIndent);
        const hasExplicitIndent = indents.length > 0;
        const markedAfterFirst = lines.slice(1).filter(line => line.marker).length;
        const hasLeadingTitle = !lines[0].marker && markedAfterFirst >= 2 && markedAfterFirst / Math.max(1, lines.length - 1) >= 0.6;
        const markerDepths = new Map();
        const parentAtDepth = [];
        let previousDepth = 0;
        return lines.map((line, index) => {
            let depth = 0;
            if (hasExplicitIndent) {
                depth = line.indentColumns > baseIndent
                    ? indents.findIndex(value => value >= line.indentColumns) + 1
                    : 0;
            } else if (line.marker) {
                const markerKey = `${line.bulletType}:${line.marker}`;
                if (markerDepths.has(markerKey)) {
                    depth = markerDepths.get(markerKey);
                } else {
                    depth = Math.min(previousDepth + 1, line.markerRank || 0);
                    markerDepths.set(markerKey, depth);
                }
            }
            // Explicit indentation already places children beneath a leading title.
            // Only offset marker-inferred outlines, otherwise equal-indent siblings
            // can drift progressively deeper after the title.
            if (hasLeadingTitle && index > 0 && !hasExplicitIndent) depth += 1;
            depth = Math.max(0, Math.min(depth, previousDepth + 1));
            const parentIndex = depth > 0 ? (parentAtDepth[depth - 1] ?? null) : null;
            parentAtDepth[depth] = index;
            parentAtDepth.length = depth + 1;
            previousDepth = depth;
            return { ...line, depth, parentIndex };
        });
    }

    _parseTextItem(s) {
        let str = String(s || '').trim();
        if (!str) return { text: '' };

        // Strip leading bullets / numbering
        str = str.replace(/^(?:(?:[-–—*+•·●○◦▪▫■□‣⁃▶►➤✓✔☑✅☐☒✗✘]|(?:\d+|[A-Za-z]|[ivxlcdmIVXLCDM]+)[.)])\s*|step\s*\d+[:.)\-]\s*|phase\s*\d+[:.)\-]\s*)/i, '');

        // Pattern "Label (value)" — common for "Peru (~70%)"
        const paren = str.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
        if (paren) {
            const before = paren[1].trim();
            const inside = paren[2].trim();
            const v = this._extractAnyNumber(inside);
            if (before && v != null) {
                return { text: before, subtext: inside, value: v };
            }
        }

        // Pattern "Label: value" / "Label - value" / compact numeric "Label-42".
        // A hyphen inside a word (high-quality, competency-based) is content,
        // not a separator, and must remain in the visible item text.
        const sepMatch = str.match(/^(.+?)\s*[:=]\s*(.+)$/)
            || str.match(/^(.+?)\s+[-–—]\s+(.+)$/)
            || str.match(/^(.+?)-\s*([~<>$€£]?\s*-?\d.+)$/);
        let text = str;
        let subtext = '';
        let value = null;
        if (sepMatch) {
            const before = sepMatch[1].trim();
            const after = sepMatch[2].trim();
            // Heuristic: only split if the label is short (<= 40 chars) so we don't mangle prose
            if (before.length > 0 && before.length <= 40 && after.length > 0) {
                text = before;
                subtext = after;
            }
        }

        // Try to extract a numeric value from anywhere in the subtext (or the trailing portion of text)
        const sourceForNum = subtext || text;
        const num = this._extractAnyNumber(sourceForNum) ?? this._extractTrailingNumber(sourceForNum);
        if (num != null) value = num;

        const out = { text };
        if (subtext) out.subtext = subtext;
        if (value != null) out.value = value;
        return out;
    }

    _extractTrailingNumber(str) {
        const m = String(str || '').replace(/,/g, '').match(/(-?\d+(?:\.\d+)?)\s*%?\s*$/);
        if (!m) return null;
        const v = parseFloat(m[1]);
        return Number.isFinite(v) ? v : null;
    }

    // Extract the first number found anywhere in a string, ignoring symbols like ~, >, <, $, (, ), %.
    _extractAnyNumber(str) {
        if (str == null) return null;
        const s = String(str).replace(/,/g, '');
        const m = s.match(/-?\d+(?:\.\d+)?/);
        if (!m) return null;
        const v = parseFloat(m[0]);
        return Number.isFinite(v) ? v : null;
    }

    _isNumeric(cell) {
        return this._toNumber(cell) != null;
    }

    _toNumber(cell) {
        if (cell == null) return null;
        const s = String(cell).replace(/[,$£€\s%]/g, '').trim();
        if (!s) return null;
        if (!/^-?\d*\.?\d+$/.test(s)) return null;
        const v = parseFloat(s);
        return Number.isFinite(v) ? v : null;
    }

    _detectKeywordHint(lower) {
        // Strong topical hints
        const map = [
            { rx: /\bswot\b/, hint: 'swot' },
            { rx: /\bpest(le)?\b/, hint: 'pestle' },
            { rx: /\bporter('s)?\s+(five|5)\s+forces\b|five forces/, hint: 'porter' },
            { rx: /\bvenn\b/, hint: 'venn' },
            { rx: /\bfishbone|ishikawa\b/, hint: 'fishbone' },
            { rx: /\b(funnel|conversion funnel|sales funnel)\b/, hint: 'funnel' },
            { rx: /\bpyramid\b/, hint: 'pyramid' },
            { rx: /\binverted\s+pyramid\b/, hint: 'inverted-pyramid' },
            { rx: /\b(cycle|loop|repeat)\b|plan\W+do\W+check\W+act|pdca/, hint: 'cycle' },
            { rx: /\bhierarchy|org(anization)?\s+chart|reports?\s+to\b/, hint: 'hierarchy' },
            { rx: /\b(timeline|milestones?|roadmap)\b/, hint: 'timeline' },
            { rx: /\b(matrix|2x2|quadrant)\b/, hint: 'matrix' },
            { rx: /\b(target|bullseye|core)\b/, hint: 'target' },
            { rx: /\b(radial|hub( and spoke)?|spokes?)\b/, hint: 'radial' },
            { rx: /\bgear|cog|interlock\b/, hint: 'gear' },
            { rx: /\bkanban|to\s*do.*doing.*done\b/, hint: 'kanban' },
            { rx: /\bgantt\b/, hint: 'gantt' },
            // "start day / end day", "start week / end week", "from .. to ..",
            // "start date / finish date" all imply a Gantt-style time range.
            { rx: /\bstart\s*(day|week|date)\b[\s\S]{0,40}\b(end|finish|recovery)\s*(day|week|date)?\b/, hint: 'gantt' },
            { rx: /\bchecklist|todo\b/, hint: 'checklist' },
            { rx: /\bbar chart|bars\b/, hint: 'bar-chart' },
            { rx: /\bdonut|pie\b/, hint: 'donut' },
            { rx: /\bheat\s*map\b/, hint: 'heat-map' },
            { rx: /\btree\s*map\b/, hint: 'treemap' },
            { rx: /\bbubble\b/, hint: 'bubble' },
            { rx: /\bjourney\b/, hint: 'journey' },
            { rx: /\bpersona\b/, hint: 'persona' },
            { rx: /\bdecision\s+tree\b/, hint: 'decision-tree' },
            { rx: /\b(raci)\b/, hint: 'raci' },
            { rx: /\brisk\s+(matrix|register|assessment)\b/, hint: 'risk' },
            { rx: /\bbusiness\s+model\s+canvas|bmc\b/, hint: 'bmc' },
            { rx: /\bokr\b/, hint: 'okr' },
            { rx: /\bbenchmarking\b|\bcompared\s+with\b|\bcompetitor\s+analysis\b/, hint: 'benchmarking' }
        ];
        for (const m of map) if (m.rx.test(lower)) return m.hint;
        return null;
    }

    /* =========================================
       Suggester
       Returns array of { templateId, score, reason }
       Sorted by score desc, top N.
       ========================================= */

    _suggest(parsed) {
        const { items, structure } = parsed;
        const n = items.length;
        const candidates = new Map(); // id → { score, reasons:[] }

        const add = (id, score, reason) => {
            const tpl = this.templates.getTemplate(id);
            if (!tpl) return;
            // Filter by item-count compatibility (with ±1 grace) — heat-map etc require exact counts
            if (n < tpl.minItems - 0 || n > tpl.maxItems + 0) {
                // hard filter — but allow if we can pad/truncate within a reasonable range
                if (n < tpl.minItems && (tpl.minItems - n) > 2) return;
                if (n > tpl.maxItems && (n - tpl.maxItems) > 4) return;
                score -= 4; // penalty for needing adjustment
            }
            const cur = candidates.get(id) || { score: 0, reasons: [] };
            cur.score += score;
            if (reason) cur.reasons.push(reason);
            candidates.set(id, cur);
        };

        // --- Keyword-driven (highest priority) ---
        switch (structure.keywordHint) {
            case 'swot': add('swot-matrix', 30, 'detected SWOT'); break;
            case 'pestle': add('pestle-analysis', 30, 'detected PESTLE'); break;
            case 'porter': add('porters-five', 30, 'detected Porter\'s Five Forces'); break;
            case 'venn': add('basic-venn', 30, 'detected Venn'); break;
            case 'fishbone': add('fishbone-diagram', 30, 'detected Fishbone'); break;
            case 'funnel': add('funnel-process', 28, 'funnel keyword'); add('marketing-funnel', 22, 'funnel keyword'); break;
            case 'pyramid': add('basic-pyramid', 28, 'pyramid keyword'); break;
            case 'inverted-pyramid': add('inverted-pyramid', 30, 'inverted pyramid'); break;
            case 'cycle': add('basic-cycle', 28, 'cycle keyword'); add('segmented-cycle', 22, 'cycle keyword'); add('pdca-cycle', 20, 'cycle keyword'); add('gear-cycle', 18, 'cycle keyword'); break;
            case 'hierarchy': add('org-chart', 28, 'hierarchy keyword'); add('horizontal-hierarchy', 22, 'hierarchy keyword'); add('wbs', 18, 'hierarchy keyword'); break;
            case 'timeline': add('timeline-process', 28, 'timeline keyword'); add('milestone-timeline', 24, 'timeline keyword'); add('roadmap', 20, 'timeline keyword'); break;
            case 'matrix': add('basic-matrix', 28, 'matrix keyword'); add('swot-matrix', 18, 'matrix keyword'); break;
            case 'target': add('basic-target', 28, 'target keyword'); break;
            case 'radial': add('radial', 28, 'radial keyword'); break;
            case 'gear': add('gear-cycle', 28, 'gear keyword'); break;
            case 'kanban': add('kanban-board', 30, 'kanban keyword'); break;
            case 'gantt': add('gantt-chart', 30, 'gantt keyword'); break;
            case 'checklist': add('checklist', 28, 'checklist keyword'); break;
            case 'bar-chart': add('bar-chart', 28, 'bar chart keyword'); add('horizontal-bar-chart', 20, 'bar chart keyword'); break;
            case 'donut': add('donut-chart', 28, 'donut/pie keyword'); break;
            case 'heat-map': add('heat-map', 28, 'heat map keyword'); break;
            case 'treemap': add('treemap', 28, 'treemap keyword'); break;
            case 'bubble': add('bubble-chart', 28, 'bubble keyword'); break;
            case 'journey': add('customer-journey', 28, 'journey keyword'); break;
            case 'persona': add('persona-card', 28, 'persona keyword'); break;
            case 'decision-tree': add('decision-tree', 28, 'decision tree'); break;
            case 'raci': add('raci-matrix', 30, 'RACI keyword'); break;
            case 'risk': add('risk-matrix', 28, 'risk keyword'); break;
            case 'bmc': add('business-model-canvas', 30, 'BMC keyword'); break;
            case 'okr': add('okr-framework', 30, 'OKR keyword'); break;
            case 'benchmarking': add('competitor-analysis', 30, 'benchmarking keyword'); add('comparison-infographic', 16, 'comparison keyword'); break;
        }

        if (/\bpestle\s+analysis\b/i.test(structure.rawText || '')) add('pestle-analysis', 18, 'detected PESTLE');
        if (/\bswot\s+analysis\b/i.test(structure.rawText || '')) add('swot-matrix', 18, 'detected SWOT');
        if (/\bbenchmarking\b|\bcompared\s+with\b/i.test(structure.rawText || '')) add('competitor-analysis', 18, 'detected benchmarking');

        // --- Numeric data → charts ---
        if (structure.numericRatio >= 0.6 && n >= 2) {
            add('bar-chart', 22, `${Math.round(structure.numericRatio * 100)}% rows have a numeric value`);
            add('horizontal-bar-chart', 20, 'numeric values');
            if (n <= 6) add('donut-chart', 20, 'numeric values, ≤6 items');
            if (n >= 3 && n <= 8) add('treemap', 16, 'numeric values, 3–8 items');
            if (n >= 3 && n <= 8) add('bubble-chart', 14, 'numeric values, 3–8 items');
            if (n >= 3) add('progress-bars', 14, 'percent-style values');
            if (n >= 3 && n <= 6) add('radial-progress', 12, 'percent-style values');
        }

        // --- Arrows or process-y wording → process flows ---
        if (structure.hasArrows) {
            add('basic-process', 24, 'arrow-connected steps');
            add('chevron-process', 20, 'arrow-connected steps');
            add('alternating-flow', 16, 'arrow-connected steps');
            add('flowchart', 18, 'arrow-connected steps');
            add('timeline-process', 14, 'arrow-connected steps');
        }

        // --- Hierarchy / indentation ---
        if (structure.hasHierarchy) {
            add('org-chart', 26, `indentation depth ${structure.maxDepth}`);
            add('horizontal-hierarchy', 22, 'indentation');
            add('tree-chart', structure.maxDepth >= 3 ? 28 : 20, `${structure.maxDepth}-level outline`);
            add('labeled-hierarchy', structure.maxDepth >= 3 ? 26 : 18, 'nested bullet levels');
            add('wbs', structure.maxDepth >= 3 ? 24 : 18, 'nested work breakdown');
            add('decision-tree', 14, 'indentation');
        }

        if (structure.isChecklist) {
            add('checklist', 30, 'check-mark bullets');
            add('accent-list', 14, 'check-mark list');
        } else if (structure.hasBullets && !structure.hasHierarchy) {
            add('basic-block-list', 20, 'flat bullet list');
            add('horizontal-bullet-list', 18, 'flat bullet list');
            add('accent-list', 14, 'flat bullet list');
        }

        if (structure.isNumberedOutline && !structure.hasHierarchy) {
            add('basic-process', 30, 'numbered sequence');
            add('chevron-process', 22, 'numbered sequence');
            add('alternating-flow', 16, 'numbered sequence');
        }

        // --- Comparison / 2 items ---
        if (structure.hasComparison || (n === 2 && structure.source === 'text')) {
            add('opposing-ideas', 24, 'two contrasting items');
            add('basic-matrix', 14, 'comparison');
        }

        // --- Counts that suggest specific layouts ---
        if (n === 4) add('swot-matrix', 8, '4 items often map to SWOT');
        if (n === 4) add('basic-matrix', 8, '4 items map to a 2×2');
        if (n === 9) add('heat-map', 12, 'exactly 9 items fits a 3×3 heat map');

        // --- Default list / process fallbacks (always candidates) ---
        add('basic-block-list', 8, 'general list fallback');
        add('horizontal-bullet-list', 6, 'general list fallback');
        add('accent-list', 6, 'general list fallback');
        add('stacked-list', 5, 'general list fallback');
        if (n >= 2 && n <= 8) add('basic-process', 5, 'sequence fallback');
        if (n >= 3 && n <= 8) add('basic-cycle', 4, 'circular fallback');

        // --- Use the templates' own search index against the raw text ---
        const searchSource = structure.rawText || (structure.headers ? structure.headers.join(' ') : '');
        if (searchSource) {
            const top = this.templates.findBestTemplateMatch(searchSource);
            if (top) add(top.id, 10, 'matched by template search');
        }

        // Sort and return top N
        const sorted = Array.from(candidates.entries())
            .map(([id, v]) => ({ templateId: id, score: v.score, reason: v.reasons[0] || '' }))
            .sort((a, b) => b.score - a.score);
        return sorted.slice(0, 6);
    }

    /* =========================================
       Rendering
       ========================================= */

    _renderSummary(parsed) {
        if (!this.elSummary) return;
        if (!parsed) { this.elSummary.innerHTML = ''; return; }
        if (parsed.error) {
            this.elSummary.innerHTML = `<div class="sa-import-summary-row sa-import-error"><i class="fas fa-circle-exclamation"></i> ${this._escape(parsed.error)}</div>`;
            return;
        }
        const { items, structure } = parsed;
        const facts = [];
        facts.push(`<strong>${items.length}</strong> item${items.length === 1 ? '' : 's'}`);
        facts.push(structure.source === 'table'
            ? `table · ${structure.columns} col${structure.columns === 1 ? '' : 's'} (${structure.separator})`
            : 'free text');
        if (structure.hasNumbers) facts.push(`numeric values present (${Math.round(structure.numericRatio * 100)}%)`);
        if (structure.hasArrows) facts.push('arrow flow detected');
        if (structure.isChecklist) facts.push('checklist bullets detected');
        else if (structure.hasBullets) facts.push(`${structure.bulletCount} bullet${structure.bulletCount === 1 ? '' : 's'} detected`);
        if (structure.hasHierarchy) facts.push(`hierarchy (depth ${structure.maxDepth})`);
        if (structure.hasComparison) facts.push('comparison detected');
        if (structure.keywordHint) facts.push(`hint: <em>${this._escape(structure.keywordHint)}</em>`);

        this.elSummary.innerHTML = `
            <div class="sa-import-summary-row">
                <i class="fas fa-info-circle"></i>
                <span>${facts.join(' · ')}</span>
            </div>
        `;
    }

    _renderSuggestions(suggestions) {
        if (!this.elSuggestions) return;
        if (!suggestions.length) { this.elSuggestions.innerHTML = ''; return; }
        const cards = suggestions.map((s, idx) => {
            const tpl = this.templates.getTemplate(s.templateId);
            if (!tpl) return '';
            const reason = s.reason ? `<div class="sa-import-card-reason">${this._escape(s.reason)}</div>` : '';
            const badge = idx === 0 ? '<span class="sa-import-badge">Best match</span>' : '';
            return `
                <button type="button" class="sa-import-card" data-id="${this._escape(tpl.id)}">
                    <div class="sa-import-card-head">
                        <span class="sa-import-card-name">${this._escape(tpl.name)}</span>
                        ${badge}
                    </div>
                    <div class="sa-import-card-desc">${this._escape(tpl.description || '')}</div>
                    ${reason}
                </button>
            `;
        }).join('');
        this.elSuggestions.innerHTML = `
            <div class="sa-import-suggestions-header">Suggested templates</div>
            <div class="sa-import-cards">${cards}</div>
        `;
        this.elSuggestions.querySelectorAll('.sa-import-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                if (!id || !this._lastParse) return;
                this._applyTemplate(id, this._lastParse.items);
            });
        });
    }

    _applyTemplate(templateId, items) {
        const tpl = this.templates.getTemplate(templateId);
        if (!tpl) {
            this._toast('Template not found', 'error');
            return;
        }
        // Pad / truncate to the template's allowed range. Preserve the parsed
        // numeric `value` so downstream chart generators (which read it via
        // `_getItemNumericValue` → `_getItemSecondaryValue`) can size bars,
        // segments, etc. correctly. We also fall back to populating `subtext`
        // from `value` when no subtext was detected, so the value still shows
        // up as the visible label on bar / column charts.
        let prepared = items.map(it => {
            const out = { text: String(it.text || '').trim() || 'Item' };
            if (it.subtext) out.subtext = String(it.subtext);
            if (it.value != null && Number.isFinite(it.value)) {
                out.value = it.value;
                if (!out.subtext) out.subtext = String(it.value);
            }
            // Preserve fields needed by date/range-aware templates (Gantt, etc.)
            if (Array.isArray(it.values) && it.values.length) out.values = it.values.slice();
            if (Array.isArray(it.cells) && it.cells.length) out.cells = it.cells.slice();
            if (typeof it.start === 'number') out.start = it.start;
            if (typeof it.end === 'number') out.end = it.end;
            if (typeof it.duration === 'number') out.duration = it.duration;
            if (Number.isInteger(it._depth)) out._depth = Math.max(0, it._depth);
            if (Number.isInteger(it._parentIndex)) out._parentIndex = it._parentIndex;
            else if (it._parentIndex === null) out._parentIndex = null;
            if (it._bulletType) out._bulletType = String(it._bulletType);
            if (it._bulletMarker) out._bulletMarker = String(it._bulletMarker);
            if (Number.isInteger(it._outlineIndex)) out._outlineIndex = it._outlineIndex;
            return out;
        });
        if (prepared.length < tpl.minItems) {
            while (prepared.length < tpl.minItems) {
                prepared.push({ text: `Item ${prepared.length + 1}` });
            }
        } else if (prepared.length > tpl.maxItems) {
            prepared = prepared.slice(0, tpl.maxItems);
        }

        // Stash table headers on the templates instance so generators can
        // discover units ("Day", "Week", "Date") for axis labels.
        try {
            const headers = this._lastParse?.structure?.headers || null;
            this.manager.templates._tableHeaders = headers;
        } catch (_) {}

        try {
            this.manager.applyTemplate(templateId, prepared);
            this._toast(`Applied "${tpl.name}" with ${prepared.length} items`, 'success');
            // Sync the force-template select to the chosen template
            if (this.elSelect) this.elSelect.value = templateId;
        } catch (e) {
            const message = e && e.message ? e.message : String(e || 'Unknown error');
            console.error('SmartArtImport apply failed:', {
                templateId,
                templateName: tpl.name,
                itemCount: prepared.length,
                error: e
            });
            this._toast(`Failed to apply template: ${message}`, 'error');
        }
    }

    _escape(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /* =========================================
       Public API for SmartArt AI
       ========================================= */

    // Parse + suggest. Returns { items, structure, suggestions[] }.
    analyze(rawText) {
        const parsed = this._parse(rawText || '');
        const suggestions = parsed.items.length ? this._suggest(parsed) : [];
        return { ...parsed, suggestions };
    }

    // Apply a template (with the parsed items) and update the textarea + summary panels
    // so the user can see what was detected. Falls back to the best suggestion if no id given.
    applyFromText(rawText, forcedTemplateId) {
        const result = this.analyze(rawText);
        if (!result.items.length) return null;
        const targetId = forcedTemplateId || (result.suggestions[0] && result.suggestions[0].templateId);
        if (!targetId) return null;
        // Mirror the input into the Import tab so the user can tweak it later.
        if (this.elInput && rawText) this.elInput.value = rawText;
        this._lastParse = result;
        this._renderSummary(result);
        this._renderSuggestions(result.suggestions);
        this._applyTemplate(targetId, result.items);
        return { templateId: targetId, items: result.items, suggestions: result.suggestions };
    }
}

// Expose globally so smartart.html init can pick it up
window.SmartArtImport = SmartArtImport;
