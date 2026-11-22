/* Lightweight, dependency-free syntax highlighter for the Code panel and
   AI generated code preview. Supports JavaScript and Python. Pure additive:
   if anything goes wrong, falls back to plain text. */
(function () {
    'use strict';

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    var KW_JS = new Set([
        'var','let','const','function','return','if','else','for','while','do',
        'switch','case','break','continue','default','new','class','extends',
        'super','this','try','catch','finally','throw','typeof','instanceof',
        'in','of','delete','void','yield','async','await','import','export',
        'from','as','true','false','null','undefined'
    ]);
    var KW_PY = new Set([
        'def','return','if','elif','else','for','while','break','continue',
        'pass','class','import','from','as','try','except','finally','raise',
        'with','lambda','yield','global','nonlocal','in','is','not','and','or',
        'True','False','None','self'
    ]);

    function highlight(code, lang) {
        try {
            var src = String(code == null ? '' : code);
            var kw = (lang === 'python' || lang === 'py') ? KW_PY : KW_JS;
            // Token regex: comments, strings, numbers, identifiers, operators
            // Order matters: longest specific patterns first.
            var re = new RegExp([
                /\/\/[^\n]*/.source,                  // // line comment
                /#[^\n]*/.source,                     // # python line comment
                /\/\*[\s\S]*?\*\//.source,            // /* block */
                /"""[\s\S]*?"""/.source,              // python triple
                /'''[\s\S]*?'''/.source,
                /`(?:\\[\s\S]|[^`\\])*`/.source,      // js template literal
                /"(?:\\[\s\S]|[^"\\])*"/.source,      // double string
                /'(?:\\[\s\S]|[^'\\])*'/.source,      // single string
                /\b0[xX][0-9a-fA-F]+\b/.source,       // hex
                /\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/.source, // number
                /\b[A-Za-z_$][\w$]*\b/.source,        // identifier
                /[{}()\[\];,.:?+\-*/=<>!&|^~%]+/.source // operators
            ].join('|'), 'g');

            var out = '';
            var last = 0;
            var m;
            while ((m = re.exec(src)) !== null) {
                if (m.index > last) out += escapeHtml(src.slice(last, m.index));
                var tok = m[0];
                var first = tok.charAt(0);
                var cls = '';
                if (tok.startsWith('//') || tok.startsWith('/*') || (lang === 'python' && tok.startsWith('#'))) {
                    cls = 'tok-comment';
                } else if (first === '"' || first === '\'' || first === '`') {
                    cls = 'tok-string';
                } else if (/^[0-9]/.test(tok) || /^0[xX]/.test(tok)) {
                    cls = 'tok-number';
                } else if (/^[A-Za-z_$]/.test(tok)) {
                    if (kw.has(tok)) cls = 'tok-keyword';
                    else if (/^[A-Z]/.test(tok)) cls = 'tok-type';
                    // function-call hint: identifier followed by (
                    else {
                        var next = src.charAt(re.lastIndex);
                        if (next === '(') cls = 'tok-fn';
                        else cls = 'tok-ident';
                    }
                } else {
                    cls = 'tok-op';
                }
                out += '<span class="' + cls + '">' + escapeHtml(tok) + '</span>';
                last = re.lastIndex;
            }
            if (last < src.length) out += escapeHtml(src.slice(last));
            return out;
        } catch (err) {
            return escapeHtml(code);
        }
    }

    function apply(el, code, lang) {
        if (!el) return;
        // If user is currently editing, leave plain text alone.
        if (el.isContentEditable || el.contentEditable === 'true') {
            el.textContent = code;
            return;
        }
        try {
            el.innerHTML = highlight(code, lang);
            el.classList.add('code-highlighted');
        } catch (err) {
            el.textContent = code;
        }
    }

    window.AnimStageHighlight = { highlight: highlight, apply: apply };
})();
