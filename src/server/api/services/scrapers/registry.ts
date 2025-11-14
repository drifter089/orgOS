/**
 * Scraper Registry
 *
 * Central registry for all available scrapers. This provides a plugin-style
 * architecture where new scrapers can be registered and discovered automatically.
 */

import type { BaseScraperConfig, Scraper, ScraperConfig } from "./types";
import { googleSheetsScraper } from "./google-sheets";

/**
 * Registry of all available scrapers
 */
class ScraperRegistry {
  private scrapers = new Map<string, Scraper>();

  constructor() {
    // Register all available scrapers
    this.register(googleSheetsScraper);

    // Future scrapers can be registered here:
    // this.register(instagramScraper);
    // this.register(youtubeScraper);
  }

  /**
   * Register a new scraper
   */
  register(scraper: Scraper): void {
    if (this.scrapers.has(scraper.type)) {
      console.warn(
        `[ScraperRegistry] Overwriting existing scraper: ${scraper.type}`,
      );
    }
    this.scrapers.set(scraper.type, scraper);
    console.info(`[ScraperRegistry] Registered scraper: ${scraper.type}`);
  }

  /**
   * Get a scraper by type
   */
  get(type: string): Scraper | undefined {
    return this.scrapers.get(type);
  }

  /**
   * Get all registered scrapers
   */
  getAll(): Scraper[] {
    return Array.from(this.scrapers.values());
  }

  /**
   * Get all scraper types
   */
  getTypes(): string[] {
    return Array.from(this.scrapers.keys());
  }

  /**
   * Check if a scraper type is registered
   */
  has(type: string): boolean {
    return this.scrapers.has(type);
  }

  /**
   * Validate a scraper config and return the appropriate scraper
   */
  validateAndGetScraper(config: unknown): {
    scraper: Scraper<BaseScraperConfig>;
    config: ScraperConfig;
  } | null {
    if (typeof config !== "object" || config === null) {
      return null;
    }

    const c = config as Record<string, unknown>;
    const scraperType = c.scraperType;

    if (typeof scraperType !== "string") {
      return null;
    }

    const scraper = this.get(scraperType);
    if (!scraper) {
      console.warn(
        `[ScraperRegistry] Unknown scraper type: ${scraperType}`,
      );
      return null;
    }

    if (!scraper.validate(config)) {
      console.warn(
        `[ScraperRegistry] Invalid config for scraper: ${scraperType}`,
      );
      return null;
    }

    return {
      scraper: scraper as Scraper<BaseScraperConfig>,
      config: config as ScraperConfig,
    };
  }
}

// Export singleton instance
export const scraperRegistry = new ScraperRegistry();

/**
 * Helper function to scrape a value using the registry
 */
export async function scrapeValue(
  config: unknown,
): Promise<{ success: boolean; value?: number; error?: string }> {
  const result = scraperRegistry.validateAndGetScraper(config);

  if (!result) {
    return {
      success: false,
      error: "Invalid scraper configuration",
    };
  }

  const { scraper, config: validConfig } = result;

  try {
    const scrapeResult = await scraper.fetchValue(validConfig);
    return scrapeResult;
  } catch (error) {
    console.error("[ScraperRegistry] Error during scrape:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown scraping error",
    };
  }
}
