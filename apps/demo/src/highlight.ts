// Minimal regex tokenizer for TS/JS/CSS/shell snippets rendered as raw HTML.
// Light theme, GitHub-style colors via the .tok-* classes in chat.css.

const KEYWORDS = new Set([
  'const', 'let', 'var', 'new', 'function', 'return', 'import', 'from', 'export',
  'type', 'interface', 'class', 'extends', 'implements', 'if', 'else', 'for',
  'while', 'async', 'await', 'readonly', 'true', 'false', 'null', 'undefined',
  'void', 'number', 'string', 'boolean', 'npm',
]);

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const TOKEN_RE =
  /(\/\/[^\n]*|#(?![0-9a-fA-F])[^\n]*)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|(\b\d[\d_]*(?:\.\d+)?(?:px|em|rem|ms|s)?\b)|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$-]*)/g;

export function highlightCode(code: string): string {
  let out = '';
  let last = 0;
  for (const m of code.matchAll(TOKEN_RE)) {
    const i = m.index;
    out += esc(code.slice(last, i));
    const [full, comment, str, num, call, word] = m;
    if (comment) out += `<span class="tok-c">${esc(comment)}</span>`;
    else if (str) out += `<span class="tok-s">${esc(str)}</span>`;
    else if (num) out += `<span class="tok-n">${esc(num)}</span>`;
    else if (call) out += `<span class="tok-f">${esc(call)}</span>`;
    else if (word && KEYWORDS.has(word)) out += `<span class="tok-k">${esc(word)}</span>`;
    else out += esc(full);
    last = i + full.length;
  }
  out += esc(code.slice(last));
  return out;
}
