/**
 * PostHog Conversion Rate Sync
 *
 * Calculates and syncs conversion funnel metrics from PostHog.
 * Requires per-connection configuration of funnel steps.
 * Runs every 30 minutes.
 */

import type { NangoSync, PostHogConversionData } from './models';

export default async function fetchConversionRate(nango: NangoSync) {
    try {
        // Get connection-specific configuration
        const connection = await nango.getConnection();
        const config = connection.connection_config;

        // Validate required configuration
        const funnelSteps = config?.funnel_steps as string[] | undefined;
        if (!funnelSteps || !Array.isArray(funnelSteps) || funnelSteps.length < 2) {
            await nango.log('No funnel steps configured. Using default: pageview -> signup');
            // Use default funnel if not configured
            const defaultSteps = ['$pageview', 'signup_started', 'signup_completed'];
            await calculateFunnel(nango, defaultSteps);
            return;
        }

        await nango.log(`Calculating conversion funnel with ${funnelSteps.length} steps: ${funnelSteps.join(' → ')}`);

        await calculateFunnel(nango, funnelSteps);
    } catch (error) {
        throw new nango.ActionError({
            message: `Failed to sync conversion rate: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
    }
}

async function calculateFunnel(nango: NangoSync, funnelSteps: string[]) {
    // Get date range from config or use default (last 7 days)
    const connection = await nango.getConnection();
    const config = connection.connection_config;
    const dateFrom = (config?.date_from as string) || '-7d';
    const dateTo = (config?.date_to as string) || 'now';

    // Call PostHog insights API to calculate funnel
    const response = await nango.post({
        endpoint: '/api/insights/funnel/',
        data: {
            events: funnelSteps.map((step, index) => ({
                id: step,
                order: index,
                type: 'events'
            })),
            date_from: dateFrom,
            date_to: dateTo,
            insight: 'FUNNELS',
            funnel_viz_type: 'steps'
        }
    });

    // Extract funnel results
    const results = response.data.result || response.data;

    // Calculate conversion rate (users who completed all steps / users who started)
    const totalUsers = results[0]?.count || 0;
    const convertedUsers = results[results.length - 1]?.count || 0;
    const conversionRate = totalUsers > 0 ? (convertedUsers / totalUsers) * 100 : 0;

    // Create conversion data record
    const conversionData: PostHogConversionData = {
        id: `funnel-${Date.now()}`,
        conversion_rate: Math.round(conversionRate * 100) / 100, // Round to 2 decimals
        total_users: totalUsers,
        converted_users: convertedUsers,
        funnel_steps: funnelSteps,
        timestamp: new Date().toISOString()
    };

    // Save to Nango's cache (full sync, not incremental)
    await nango.batchSave([conversionData], 'PostHogConversionData');

    await nango.log(`Conversion rate: ${conversionRate.toFixed(2)}% (${convertedUsers}/${totalUsers} users)`);
}
