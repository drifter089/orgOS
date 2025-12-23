/**
 * Pipeline Router
 *
 * Handles metric data pipeline operations with fire-and-forget pattern:
 * - refresh: Soft refresh (reuse transformers) - returns immediately
 * - regenerate: Hard refresh (delete & recreate) - returns immediately
 * - getProgress: Poll endpoint for frontend status updates
 *
 * Fire-and-forget pattern:
 * 1. Set metric.refreshStatus = starting step
 * 2. Return immediately to frontend
 * 3. Run pipeline in background (NOT awaited)
 * 4. Frontend polls getProgress to show progress
 */
import { z } from "zod";

import { refreshMetricAndCharts } from "@/server/api/services/transformation";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { getMetricAndVerifyAccess } from "@/server/api/utils/authorization";

/**
 * Fire-and-forget wrapper for pipeline operations.
 * Runs the pipeline in background, updates metric.refreshStatus on completion/error.
 *
 * Note: Uses the service's internal db singleton since it runs after response is sent.
 */
async function runPipelineInBackground(
  metricId: string,
  forceRegenerate: boolean,
): Promise<void> {
  try {
    const result = await refreshMetricAndCharts({
      metricId,
      forceRegenerate,
    });

    // Note: refreshMetricAndCharts handles status updates internally
    // It clears refreshStatus on success and sets lastError on failure
    if (!result.success) {
      console.error(
        `[Pipeline] Background pipeline failed for ${metricId}:`,
        result.error,
      );
    }
  } catch (error) {
    console.error(
      `[Pipeline] Background pipeline error for ${metricId}:`,
      error,
    );
    // Error handling is done inside refreshMetricAndCharts
  }
}

export const pipelineRouter = createTRPCRouter({
  /**
   * Refresh metric (soft refresh - reuse transformers)
   * FIRE-AND-FORGET: Returns immediately, frontend polls getProgress
   */
  refresh: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      // Set initial status
      await ctx.db.metric.update({
        where: { id: input.metricId },
        data: { refreshStatus: "fetching-api-data", lastError: null },
      });

      // Fire-and-forget: DO NOT await
      void runPipelineInBackground(input.metricId, false);

      // Return immediately - frontend polls getProgress
      return { success: true, started: true };
    }),

  /**
   * Regenerate metric (hard refresh - delete old data + regenerate transformers)
   * FIRE-AND-FORGET: Returns immediately, frontend polls getProgress
   */
  regenerate: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      // Set initial status
      await ctx.db.metric.update({
        where: { id: input.metricId },
        data: { refreshStatus: "deleting-old-data", lastError: null },
      });

      // Fire-and-forget: DO NOT await
      void runPipelineInBackground(input.metricId, true);

      // Return immediately - frontend polls getProgress
      return { success: true, started: true };
    }),

  /**
   * Get pipeline progress for frontend polling
   */
  getProgress: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify access first
      await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      const metric = await ctx.db.metric.findUnique({
        where: { id: input.metricId },
        select: { refreshStatus: true, lastError: true },
      });

      if (!metric?.refreshStatus) {
        return {
          isProcessing: false,
          currentStep: null,
          error: metric?.lastError,
        };
      }

      return {
        isProcessing: true,
        currentStep: metric.refreshStatus,
        error: null,
      };
    }),
});
