"use client";

import { type ReactNode, createContext, useContext } from "react";

import type { RouterOutputs } from "@/trpc/react";

type PublicTeamData = RouterOutputs["publicView"]["getTeamByShareToken"];
type PublicDashboardData =
  RouterOutputs["publicView"]["getDashboardByShareToken"];

type PublicViewContextValue = {
  team: PublicTeamData | null;
  dashboard: PublicDashboardData | null;
  token: string;
  readOnly: true;
};

const PublicViewContext = createContext<PublicViewContextValue | null>(null);

interface PublicViewProviderProps {
  children: ReactNode;
  team?: PublicTeamData;
  dashboard?: PublicDashboardData;
  token: string;
}

export function PublicViewProvider({
  children,
  team,
  dashboard,
  token,
}: PublicViewProviderProps) {
  return (
    <PublicViewContext.Provider
      value={{
        team: team ?? null,
        dashboard: dashboard ?? null,
        token,
        readOnly: true,
      }}
    >
      {children}
    </PublicViewContext.Provider>
  );
}

export function usePublicView() {
  const context = useContext(PublicViewContext);
  if (!context) {
    throw new Error("usePublicView must be used within PublicViewProvider");
  }
  return context;
}

export function usePublicViewOptional() {
  return useContext(PublicViewContext);
}
