/**
 * Scraper Types and Interfaces
 *
 * This file defines the standard interface that all scrapers must implement.
 * This allows for a plugin-style architecture where new scrapers can be added
 * without modifying the core sync logic.
 */

/**
 * Base configuration that all scrapers share
 */
export interface BaseScraperConfig {
  scraperType: string; // e.g., "google-sheets", "instagram", "youtube"
  sourceUrl: string; // The URL to scrape from
}

/**
 * Google Sheets specific configuration
 */
export interface GoogleSheetsConfig extends BaseScraperConfig {
  scraperType: "google-sheets";
  sheetId: string; // Extracted from URL
  sheetName?: string; // Sheet tab name (defaults to first sheet)
  cellReference?: string; // e.g., "A1", "B5"
  range?: string; // e.g., "A1:B10" for range extraction
  aggregation?: "sum" | "average" | "min" | "max" | "count"; // How to aggregate range values
}

/**
 * Instagram scraper configuration (future implementation)
 */
export interface InstagramConfig extends BaseScraperConfig {
  scraperType: "instagram";
  username: string;
  metric: "followers" | "posts" | "engagement";
}

/**
 * YouTube scraper configuration (future implementation)
 */
export interface YouTubeConfig extends BaseScraperConfig {
  scraperType: "youtube";
  channelId: string;
  metric: "subscribers" | "views" | "videos";
}

/**
 * Union type of all scraper configs
 */
export type ScraperConfig =
  | GoogleSheetsConfig
  | InstagramConfig
  | YouTubeConfig;

/**
 * Preview data for displaying sheets/content to users
 */
export interface SheetPreview {
  sheetNames: string[]; // Available sheet tabs
  data: {
    sheetName: string;
    rows: (string | number)[][];
    headers?: string[];
  }[];
}

/**
 * Result of a scraping operation
 */
export interface ScrapeResult {
  success: boolean;
  value?: number;
  error?: string;
  metadata?: {
    scrapedAt: Date;
    source: string;
    rawData?: unknown;
  };
}

/**
 * Standard interface that all scrapers must implement
 */
export interface Scraper<TConfig extends BaseScraperConfig = BaseScraperConfig> {
  /**
   * Unique identifier for this scraper type
   */
  readonly type: string;

  /**
   * Validate that the configuration is correct for this scraper
   */
  validate(config: unknown): config is TConfig;

  /**
   * Fetch the metric value from the source
   */
  fetchValue(config: TConfig): Promise<ScrapeResult>;

  /**
   * Preview the data source (for UI display and configuration)
   * This allows users to see the sheet/content before selecting what to extract
   */
  preview?(url: string): Promise<SheetPreview>;

  /**
   * Extract configuration from a URL (for quick setup)
   * e.g., parse Google Sheets URL to extract sheet ID
   */
  parseUrl?(url: string): Partial<TConfig> | null;
}
