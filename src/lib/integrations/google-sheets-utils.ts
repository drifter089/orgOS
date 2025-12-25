/**
 * Google Sheets Utility Functions
 * Shared helpers for A1 notation and column/row conversion
 */

/**
 * Convert column index to letter (0 -> A, 1 -> B, 25 -> Z, 26 -> AA, etc.)
 */
export function columnToLetter(col: number): string {
  let letter = "";
  let temp = col;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Convert selection coordinates to A1 notation (e.g., "Sheet1!A1:B10")
 */
export function selectionToA1Notation(
  sheetName: string,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): string {
  const startColLetter = columnToLetter(startCol);
  const endColLetter = columnToLetter(endCol);
  // Rows are 1-indexed in A1 notation
  return `${sheetName}!${startColLetter}${startRow + 1}:${endColLetter}${endRow + 1}`;
}

/**
 * Parse A1 notation range to extract row/column bounds
 * Example: "Sheet1!B3:E20" -> { startRow: 2, startCol: 1, endRow: 19, endCol: 4 }
 */
export function parseA1Notation(range: string): {
  sheetName: string;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
} | null {
  // Match pattern: SheetName!A1:B2
  const match = /^(.+)!([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(range);
  if (!match) return null;

  const [, sheetName, startColStr, startRowStr, endColStr, endRowStr] = match;
  if (!sheetName || !startColStr || !startRowStr || !endColStr || !endRowStr) {
    return null;
  }

  return {
    sheetName,
    startRow: parseInt(startRowStr, 10) - 1, // Convert to 0-indexed
    startCol: letterToColumn(startColStr),
    endRow: parseInt(endRowStr, 10) - 1, // Convert to 0-indexed
    endCol: letterToColumn(endColStr),
  };
}

/**
 * Convert column letter to index (A -> 0, B -> 1, Z -> 25, AA -> 26, etc.)
 */
export function letterToColumn(letter: string): number {
  let col = 0;
  for (let i = 0; i < letter.length; i++) {
    col = col * 26 + (letter.charCodeAt(i) - 64);
  }
  return col - 1; // Convert to 0-indexed
}

export interface SelectionRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}
