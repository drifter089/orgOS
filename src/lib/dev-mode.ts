/**
 * Check if the application is running in development mode.
 * Use this to conditionally render dev-only features.
 */
export const isDevMode = () => process.env.NODE_ENV === "development";
