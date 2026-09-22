export type DiffToken = { value: string; changed: boolean };

function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/**
 * Word-level diff by longest common subsequence, so the before/after view shows
 * what actually moved instead of two walls of text. Pure; bullets are one line,
 * so the quadratic table is never a problem.
 */
export function diffWords(before: string, after: string): { before: DiffToken[]; after: DiffToken[] } {
  const a = tokenize(before);
  const b = tokenize(after);
  const table: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );

  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const beforeTokens: DiffToken[] = [];
  const afterTokens: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      beforeTokens.push({ value: a[i], changed: false });
      afterTokens.push({ value: b[j], changed: false });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      beforeTokens.push({ value: a[i], changed: true });
      i += 1;
    } else {
      afterTokens.push({ value: b[j], changed: true });
      j += 1;
    }
  }
  while (i < a.length) {
    beforeTokens.push({ value: a[i], changed: true });
    i += 1;
  }
  while (j < b.length) {
    afterTokens.push({ value: b[j], changed: true });
    j += 1;
  }

  return { before: beforeTokens, after: afterTokens };
}
