/**
 * Google Sheets Scraper
 *
 * Fetches values from public Google Sheets URLs without authentication.
 * Supports single cell values and range aggregation.
 */
import { google } from "googleapis";

import type {
  GoogleSheetsConfig,
  ScrapeResult,
  Scraper,
  SheetPreview,
} from "./types";

export class GoogleSheetsScraper implements Scraper<GoogleSheetsConfig> {
  readonly type = "google-sheets";
  private sheets = google.sheets("v4");

  /**
   * Validate Google Sheets configuration
   */
  validate(config: unknown): config is GoogleSheetsConfig {
    if (typeof config !== "object" || config === null) return false;

    const c = config as Record<string, unknown>;

    return (
      c.scraperType === "google-sheets" &&
      typeof c.sourceUrl === "string" &&
      typeof c.sheetId === "string"
    );
  }

  /**
   * Parse Google Sheets URL to extract sheet ID
   * Supports formats:
   * - https://docs.google.com/spreadsheets/d/{sheetId}/edit
   * - https://docs.google.com/spreadsheets/d/{sheetId}/edit#gid=0
   */
  parseUrl(url: string): Partial<GoogleSheetsConfig> | null {
    try {
      const match = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(url);
      if (!match?.[1]) return null;

      return {
        scraperType: "google-sheets",
        sourceUrl: url,
        sheetId: match[1],
      };
    } catch (error) {
      console.error("[GoogleSheets] Error parsing URL:", error);
      return null;
    }
  }

  /**
   * Preview sheet data for UI display
   * Fetches first 10 rows of all sheets in the spreadsheet
   */
  async preview(url: string): Promise<SheetPreview> {
    const parsed = this.parseUrl(url);
    if (!parsed?.sheetId) {
      throw new Error("Invalid Google Sheets URL");
    }

    try {
      // Get spreadsheet metadata to list all sheets
      const metadata = await this.sheets.spreadsheets.get({
        spreadsheetId: parsed.sheetId,
        key: process.env.GOOGLE_SHEETS_API_KEY,
      });

      const sheetNames =
        metadata.data.sheets
          ?.map((sheet) => sheet.properties?.title ?? "")
          .filter(Boolean) ?? [];

      // Fetch preview data from each sheet (first 10 rows)
      const data = await Promise.all(
        sheetNames.map(async (sheetName) => {
          const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: parsed.sheetId!,
            range: `${sheetName}!A1:Z10`, // First 10 rows, up to column Z
            key: process.env.GOOGLE_SHEETS_API_KEY,
          });

          const rows = (response.data.values ?? []) as (string | number)[][];
          const headers = rows.length > 0 ? (rows[0] as string[]) : undefined;

          return {
            sheetName,
            rows,
            headers,
          };
        }),
      );

      return {
        sheetNames,
        data,
      };
    } catch (error) {
      console.error("[GoogleSheets] Error fetching preview:", error);
      throw new Error(
        `Failed to preview sheet: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Fetch value from Google Sheet
   */
  async fetchValue(config: GoogleSheetsConfig): Promise<ScrapeResult> {
    try {
      // Determine the range to fetch
      const range = this.buildRange(config);

      // Fetch the data from Google Sheets API
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.sheetId,
        range,
        key: process.env.GOOGLE_SHEETS_API_KEY,
      });

      const values = response.data.values;

      if (!values || values.length === 0) {
        return {
          success: false,
          error: "No data found in the specified range",
        };
      }

      // Extract and convert value to number
      const value = this.extractValue(values, config);

      if (value === null) {
        return {
          success: false,
          error: "Could not extract numeric value from sheet data",
        };
      }

      return {
        success: true,
        value,
        metadata: {
          scrapedAt: new Date(),
          source: config.sourceUrl,
          rawData: values,
        },
      };
    } catch (error) {
      console.error("[GoogleSheets] Error fetching value:", error);
      return {
        success: false,
        error: `Failed to fetch sheet: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Build the range string for Google Sheets API
   */
  private buildRange(config: GoogleSheetsConfig): string {
    const sheetPrefix = config.sheetName ? `${config.sheetName}!` : "";

    if (config.range) {
      return `${sheetPrefix}${config.range}`;
    }

    if (config.cellReference) {
      return `${sheetPrefix}${config.cellReference}`;
    }

    // Default to A1 if no specific cell or range is specified
    return `${sheetPrefix}A1`;
  }

  /**
   * Extract numeric value from sheet data
   */
  private extractValue(
    values: (string | number)[][],
    config: GoogleSheetsConfig,
  ): number | null {
    // If single cell, just return that value
    if (values.length === 1 && values[0]?.length === 1) {
      return this.parseNumber(values[0][0]);
    }

    // If range with aggregation
    if (config.aggregation) {
      return this.aggregateValues(values, config.aggregation);
    }

    // Default: try to parse first cell
    if (values[0]?.[0] !== undefined) {
      return this.parseNumber(values[0][0]);
    }

    return null;
  }

  /**
   * Parse a value to number
   */
  private parseNumber(value: string | number | undefined): number | null {
    if (value === undefined || value === null) return null;

    if (typeof value === "number") return value;

    // Remove common formatting (commas, currency symbols)
    const cleaned = String(value)
      .replace(/[$,\s]/g, "")
      .trim();

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Aggregate values from a range
   */
  private aggregateValues(
    values: (string | number)[][],
    method: "sum" | "average" | "min" | "max" | "count",
  ): number | null {
    // Flatten and parse all values
    const numbers = values
      .flat()
      .map((v) => this.parseNumber(v))
      .filter((n): n is number => n !== null);

    if (numbers.length === 0) return null;

    switch (method) {
      case "sum":
        return numbers.reduce((a, b) => a + b, 0);
      case "average":
        return numbers.reduce((a, b) => a + b, 0) / numbers.length;
      case "min":
        return Math.min(...numbers);
      case "max":
        return Math.max(...numbers);
      case "count":
        return numbers.length;
      default:
        return null;
    }
  }
}

// Export singleton instance
export const googleSheetsScraper = new GoogleSheetsScraper();
