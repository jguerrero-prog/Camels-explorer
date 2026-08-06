export type PythonToken = {
  text: string;
  type: 'comment' | 'string' | 'number' | 'keyword' | null;
};

/** Matches, in priority order: a `#` comment to end of line, a real
 * single-quoted string (the only quote style `App.tsx`'s `py()` helper
 * ever emits - see generateTileCode), the small fixed set of keywords the
 * generated code actually uses, then an integer/float literal. Not a
 * general Python tokenizer - deliberately scoped to exactly what
 * `generateTileCode` emits (see CopyAsCodePopover's own docs), the same
 * "real, not aspirational" discipline this app applies elsewhere rather
 * than pulling in a general-purpose highlighting library for one narrow,
 * fully-controlled code shape. */
const TOKEN_PATTERN = /(#[^\n]*)|('(?:[^'\\]|\\.)*')|\b(True|False|None|import|as)\b|\b(\d+\.\d+|\d+)\b/g;

export function tokenizePython(code: string): PythonToken[] {
  const tokens: PythonToken[] = [];
  let lastIndex = 0;
  for (const match of code.matchAll(TOKEN_PATTERN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) tokens.push({ text: code.slice(lastIndex, start), type: null });
    const [full, comment, string, keyword, number] = match;
    const type = comment ? 'comment' : string ? 'string' : keyword ? 'keyword' : number ? 'number' : null;
    tokens.push({ text: full, type });
    lastIndex = start + full.length;
  }
  if (lastIndex < code.length) tokens.push({ text: code.slice(lastIndex), type: null });
  return tokens;
}
