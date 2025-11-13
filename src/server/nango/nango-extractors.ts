/**
 * Nango Data Extractors & Staleness Detection
 *
 * Utilities for:
 * - Validating metric sources still exist (staleness detection)
 * - Extracting current metric values from Nango cache
 * - Detecting deleted/changed data using _nango_metadata
 *
 * SIMPLIFIED to only support:
 * - PostHog Events
 * - Google Sheets
 */

import { Nango } from "@nangohq/node";
import { getTemplate } from "./metric-templates";

export interface IntegrationMetricData {
  id: string;
  integrationId: string;
  metricId: string;
  sourceType: string;
  sourceId: string;
  sourceConfig: any;
  nangoModel: string;
  integration: {
    connectionId: string;
    integrationId: string;
  };
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  deletedAt?: string;
  lastModifiedAt?: string;
}

export interface MetricValueResult {
  value: number;
  isStale: boolean;
  error?: string;
  recordCount?: number;
  lastModified?: string;
}

/**
 * Check if a metric's source data still exists in Nango cache
 *
 * Uses _nango_metadata.deleted_at to detect if source was deleted
 */
export async function validateMetricSource(
  nango: Nango,
  integrationMetric: IntegrationMetricData,
  connectionId: string,
  providerConfigKey: string,
): Promise<ValidationResult> {
  try {
    // Query Nango cache for the source data
    const result = await nango.listRecords({
      providerConfigKey,
      connectionId,
      model: integrationMetric.nangoModel,
      limit: 100,
      includeDeleted: true, // Include deleted records to detect staleness
    });

    // For event-based metrics, check if the specific event still exists
    if (integrationMetric.sourceType === "event") {
      const eventRecords = result.records.filter(
        (r: any) => r.event === integrationMetric.sourceId,
      );

      if (eventRecords.length === 0) {
        return {
          valid: false,
          error: `Event '${integrationMetric.sourceId}' not found in PostHog. It may have been deleted or never tracked.`,
        };
      }

      // Check if all records are deleted
      const allDeleted = eventRecords.every(
        (r: any) => r._nango_metadata?.deleted_at,
      );

      if (allDeleted) {
        return {
          valid: false,
          error: `Event '${integrationMetric.sourceId}' was deleted from PostHog`,
          deletedAt: eventRecords[0]?._nango_metadata?.deleted_at,
        };
      }

      // Get most recent modification
      const lastModified = eventRecords
        .map((r: any) => r._nango_metadata?.last_modified_at)
        .filter(Boolean)
        .sort()
        .reverse()[0];

      return {
        valid: true,
        lastModifiedAt: lastModified,
      };
    }

    // For sheet-based metrics, check if sheet exists
    if (integrationMetric.sourceType === "sheet") {
      const sheetRecords = result.records.filter(
        (r: any) => r.sheetId === integrationMetric.sourceId,
      );

      if (sheetRecords.length === 0) {
        return {
          valid: false,
          error: `Sheet '${integrationMetric.sourceId}' not found. It may have been deleted or access was revoked.`,
        };
      }

      const allDeleted = sheetRecords.every(
        (r: any) => r._nango_metadata?.deleted_at,
      );

      if (allDeleted) {
        return {
          valid: false,
          error: `Sheet was deleted from Google Drive`,
          deletedAt: sheetRecords[0]?._nango_metadata?.deleted_at,
        };
      }

      return { valid: true };
    }

    return { valid: true };
  } catch (error) {
    console.error("[Validate Metric Source] Error:", error);
    return {
      valid: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown validation error",
    };
  }
}

/**
 * Extract current value for a metric from Nango cache
 *
 * This is the main function used to refresh metric values
 */
export async function extractMetricValue(
  nango: Nango,
  integrationMetric: IntegrationMetricData,
  connectionId: string,
  providerConfigKey: string,
): Promise<MetricValueResult> {
  try {
    // First validate source still exists
    const validation = await validateMetricSource(
      nango,
      integrationMetric,
      connectionId,
      providerConfigKey,
    );

    if (!validation.valid) {
      return {
        value: 0,
        isStale: true,
        error: validation.error,
      };
    }

    // Fetch records from Nango cache
    const result = await nango.listRecords({
      providerConfigKey,
      connectionId,
      model: integrationMetric.nangoModel,
      limit: 10000, // Increased limit for full data
      includeDeleted: false, // Only get active records for value calculation
    });

    // Apply source filter based on sourceType
    let filteredRecords = result.records;

    if (integrationMetric.sourceType === "event") {
      const projectId = (integrationMetric.sourceConfig as any)?.projectId;
      filteredRecords = result.records.filter((r: any) => {
        const matchesEvent = r.event === integrationMetric.sourceId;
        if (!projectId) return matchesEvent;
        // Also filter by project_id for PostHog
        return matchesEvent && r.properties?._project_id === projectId;
      });
    } else if (integrationMetric.sourceType === "sheet") {
      filteredRecords = result.records.filter(
        (r: any) => r.sheetId === integrationMetric.sourceId,
      );
    }

    // Get template and extract value using its logic
    const templateId = (integrationMetric.sourceConfig as any)?.templateId;
    if (!templateId) {
      throw new Error("Metric source config missing templateId");
    }

    const template = getTemplate(providerConfigKey, templateId);
    if (!template) {
      throw new Error(
        `Metric template '${templateId}' not found for ${providerConfigKey}`,
      );
    }

    // Extract value using template's extraction function
    const value = template.extractValue(
      filteredRecords,
      integrationMetric.sourceConfig,
    );

    // Get last modified timestamp from records
    const lastModified = filteredRecords
      .map((r: any) => r._nango_metadata?.last_modified_at)
      .filter(Boolean)
      .sort()
      .reverse()[0];

    return {
      value: Math.round(value * 100) / 100, // Round to 2 decimal places
      isStale: false,
      recordCount: filteredRecords.length,
      lastModified,
    };
  } catch (error) {
    console.error("[Extract Metric Value] Error:", error);
    return {
      value: 0,
      isStale: true,
      error:
        error instanceof Error
          ? error.message
          : "Failed to extract value",
      recordCount: 0,
    };
  }
}

/**
 * Get unique source IDs available for selection
 *
 * Used in UI to populate dropdowns (e.g., "Which event do you want to track?")
 */
export async function getAvailableSources(
  nango: Nango,
  connectionId: string,
  providerConfigKey: string,
  sourceType: "event" | "sheet",
  nangoModel: string,
  projectId?: string, // Optional: for PostHog to filter by project
): Promise<Array<{ id: string; name: string; metadata?: any }>> {
  try {
    const result = await nango.listRecords({
      providerConfigKey,
      connectionId,
      model: nangoModel,
      limit: 10000, // Increased limit to get all available sources
      includeDeleted: false, // Only show active sources
    });

    if (sourceType === "event") {
      // Get unique event names, filtered by project if specified
      const uniqueEvents = new Map<string, any>();

      for (const record of result.records) {
        const eventName = (record as any).event;
        const recordProjectId = (record as any).properties?._project_id;

        // Filter by project if projectId is specified (for PostHog)
        if (projectId && recordProjectId && recordProjectId !== projectId) {
          continue;
        }

        if (eventName && !uniqueEvents.has(eventName)) {
          const matchingRecords = result.records.filter((r: any) => {
            const matches = r.event === eventName;
            if (!projectId) return matches;
            return matches && r.properties?._project_id === projectId;
          });

          uniqueEvents.set(eventName, {
            id: eventName,
            name: eventName,
            metadata: {
              count: matchingRecords.length,
              projectId: recordProjectId,
              projectName: (record as any).properties?._project_name,
            },
          });
        }
      }

      return Array.from(uniqueEvents.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    }

    if (sourceType === "sheet") {
      // Get unique sheets
      const uniqueSheets = new Map<string, any>();

      for (const record of result.records) {
        const sheetId = (record as any).sheetId;
        const sheetName = (record as any).sheetName || sheetId;

        if (sheetId && !uniqueSheets.has(sheetId)) {
          uniqueSheets.set(sheetId, {
            id: sheetId,
            name: sheetName,
            metadata: {
              url: (record as any).url,
            },
          });
        }
      }

      return Array.from(uniqueSheets.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    }

    return [];
  } catch (error) {
    console.error("[Get Available Sources] Error:", error);
    return [];
  }
}
