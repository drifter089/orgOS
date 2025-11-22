/**
 * Data transformation functions for GitHub API responses
 * These functions transform API data into formats suitable for UI display
 */

/**
 * Transform GitHub user profile data to extract specific metrics
 */
export function transformUserProfile(data: unknown): {
  followers: number;
  publicRepos: number;
} {
  if (!data || typeof data !== "object") {
    return { followers: 0, publicRepos: 0 };
  }

  const profile = data as {
    followers?: number;
    public_repos?: number;
  };

  return {
    followers: profile.followers ?? 0,
    publicRepos: profile.public_repos ?? 0,
  };
}

/**
 * Transform GitHub repos API response to dropdown options
 */
export function transformRepos(
  data: unknown,
): Array<{ label: string; value: string }> {
  if (!Array.isArray(data)) return [];

  return data.map(
    (repo: { full_name: string; name: string; private: boolean }) => ({
      label: `${repo.full_name}${repo.private ? " (private)" : ""}`,
      value: repo.name,
    }),
  );
}

/**
 * Transform repository data to extract star count
 */
export function transformRepoStars(data: unknown): number {
  if (!data || typeof data !== "object") return 0;
  const repo = data as { stargazers_count?: number };
  return repo.stargazers_count ?? 0;
}

/**
 * Transform repository data to extract fork count
 */
export function transformRepoForks(data: unknown): number {
  if (!data || typeof data !== "object") return 0;
  const repo = data as { forks_count?: number };
  return repo.forks_count ?? 0;
}

/**
 * Transform repository data to extract open issues count
 */
export function transformRepoOpenIssues(data: unknown): number {
  if (!data || typeof data !== "object") return 0;
  const repo = data as { open_issues_count?: number };
  return repo.open_issues_count ?? 0;
}

/**
 * Transform commit activity data (time series)
 */
export function transformCommitActivity(
  data: unknown,
): Array<{ week: number; total: number }> {
  if (!Array.isArray(data)) return [];

  return data.map((week: { week?: number; total?: number }) => ({
    week: week.week ?? 0,
    total: week.total ?? 0,
  }));
}

/**
 * Registry of all GitHub transformation functions
 */
export const GITHUB_TRANSFORMS = {
  userProfile: transformUserProfile,
  repos: transformRepos,
  repoStars: transformRepoStars,
  repoForks: transformRepoForks,
  repoOpenIssues: transformRepoOpenIssues,
  commitActivity: transformCommitActivity,
};
