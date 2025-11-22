/**
 * Data transformation functions for Google Sheets API responses
 * These functions transform API data into formats suitable for UI display
 */

/**
 * Transform Google Sheets metadata to extract sheet names for dropdown
 */
export function transformSheets(
  data: unknown,
): Array<{ label: string; value: string }> {
  if (!data || typeof data !== "object") return [];

  const response = data as {
    sheets?: Array<{ properties: { title: string } }>;
  };

  return (
    response.sheets?.map((s) => ({
      label: s.properties.title,
      value: s.properties.title,
    })) ?? []
  );
}

/**
 * Transform Google Sheets range values to extract a single cell value
 */
export function transformCellValue(data: unknown): number {
  if (!data || typeof data !== "object") return 0;

  const response = data as {
    values?: Array<Array<string | number>>;
  };

  if (!Array.isArray(response.values) || response.values.length === 0) {
    return 0;
  }

  const cellValue = response.values[0]?.[0];

  if (typeof cellValue === "number") return cellValue;
  if (typeof cellValue === "string") {
    const parsed = parseFloat(cellValue);
    return isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

/**
 * Transform Google Sheets range values to extract column data
 */
export function transformColumnData(data: unknown, columnIndex = 0): number[] {
  if (!data || typeof data !== "object") return [];

  const response = data as {
    values?: Array<Array<string | number>>;
  };

  if (!Array.isArray(response.values)) return [];

  return response.values
    .map((row) => {
      const cellValue = row[columnIndex];
      if (typeof cellValue === "number") return cellValue;
      if (typeof cellValue === "string") {
        const parsed = parseFloat(cellValue);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    })
    .filter((value) => value !== 0);
}

/**
 * Transform Google Sheets data for preview display
 * Returns raw 2D array for table rendering
 */
export function transformSheetPreview(
  data: unknown,
): Array<Array<string | number>> {
  if (!data || typeof data !== "object") return [];

  const response = data as {
    values?: Array<Array<string | number>>;
  };

  return response.values ?? [];
}

/**
 * Registry of all Google Sheets transformation functions
 */
export const GOOGLE_SHEETS_TRANSFORMS = {
  sheets: transformSheets,
  cellValue: transformCellValue,
  columnData: transformColumnData,
  sheetPreview: transformSheetPreview,
};
