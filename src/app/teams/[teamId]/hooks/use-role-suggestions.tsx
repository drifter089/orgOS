"use client";

import { useCallback, useEffect, useState } from "react";

import type { SuggestedRole } from "@/server/api/services/ai/role-generator";
import { api } from "@/trpc/react";

/**
 * Hook for fetching AI-generated role suggestions
 *
 * Features:
 * - Pre-fetches suggestions on mount (background, non-blocking)
 * - Tracks used roles and provides next available suggestion
 * - Auto-regenerates when all suggestions are used
 * - Caches results to avoid redundant API calls
 */
export function useRoleSuggestions(teamId: string) {
  const utils = api.useUtils();

  // Pre-generated role suggestions
  const {
    data: suggestionsData,
    isLoading: isLoadingSuggestions,
    error: suggestionsError,
    refetch: refetchSuggestions,
  } = api.aiRole.generateSuggestions.useQuery(
    { teamId },
    {
      // Don't refetch on window focus - suggestions are expensive
      refetchOnWindowFocus: false,
      // Cache for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Don't retry on error (user can manually refresh)
      retry: false,
    },
  );

  // Prefetch suggestions when hook mounts (fire and forget)
  useEffect(() => {
    void utils.aiRole.generateSuggestions.prefetch({ teamId });
  }, [teamId, utils.aiRole.generateSuggestions]);

  /**
   * Mark a role as used by removing it from the cache.
   * If all roles are used, triggers regeneration.
   */
  const markRoleAsUsed = useCallback(
    (usedRole: SuggestedRole) => {
      const currentData = utils.aiRole.generateSuggestions.getData({ teamId });
      if (!currentData) return;

      // Filter out the used role
      const remainingRoles = currentData.roles.filter(
        (role) => role.title !== usedRole.title,
      );

      // Update the cache with remaining roles
      utils.aiRole.generateSuggestions.setData(
        { teamId },
        {
          ...currentData,
          roles: remainingRoles,
        },
      );

      // If no roles left, trigger regeneration
      if (remainingRoles.length === 0) {
        void refetchSuggestions();
      }
    },
    [teamId, utils.aiRole.generateSuggestions, refetchSuggestions],
  );

  /**
   * Get the next available role suggestion.
   * Returns the first unused role, or undefined if none available.
   */
  const getNextRole = useCallback((): SuggestedRole | undefined => {
    const currentData = utils.aiRole.generateSuggestions.getData({ teamId });
    return currentData?.roles[0];
  }, [teamId, utils.aiRole.generateSuggestions]);

  /**
   * Get the next available role and mark it as used.
   * If no roles available, returns undefined.
   */
  const consumeNextRole = useCallback((): SuggestedRole | undefined => {
    const nextRole = getNextRole();
    if (nextRole) {
      markRoleAsUsed(nextRole);
    }
    return nextRole;
  }, [getNextRole, markRoleAsUsed]);

  return {
    suggestions: suggestionsData?.roles ?? [],
    generatedAt: suggestionsData?.generatedAt,
    isLoading: isLoadingSuggestions,
    error: suggestionsError,
    refetch: refetchSuggestions,
    markRoleAsUsed,
    getNextRole,
    consumeNextRole,
  };
}

/**
 * Hook for real-time role input enhancement
 *
 * Debounced API calls as user types to suggest better titles/purposes
 */
export function useRoleEnhancement(teamId: string) {
  const [debouncedInput, setDebouncedInput] = useState<{
    title?: string;
    purpose?: string;
  } | null>(null);

  const {
    data: enhancement,
    isLoading: isEnhancing,
    error: enhancementError,
  } = api.aiRole.enhanceInput.useQuery(
    {
      teamId,
      partialTitle: debouncedInput?.title,
      partialPurpose: debouncedInput?.purpose,
    },
    {
      enabled:
        !!debouncedInput && !!(debouncedInput.title ?? debouncedInput.purpose),
      staleTime: 2 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: false,
    },
  );

  // Debounce the input changes
  const requestEnhancement = useCallback(
    (input: { title?: string; purpose?: string }) => {
      // Only request if there's meaningful input
      if (!input.title && !input.purpose) {
        setDebouncedInput(null);
        return;
      }
      // Debounce by setting state after a delay
      const timeoutId = setTimeout(() => {
        setDebouncedInput(input);
      }, 500); // 500ms debounce

      return () => clearTimeout(timeoutId);
    },
    [],
  );

  const clearEnhancement = useCallback(() => {
    setDebouncedInput(null);
  }, []);

  return {
    enhancement,
    isEnhancing,
    enhancementError,
    requestEnhancement,
    clearEnhancement,
  };
}

export type { SuggestedRole };
