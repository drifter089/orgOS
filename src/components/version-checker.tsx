"use client";

import { useEffect, useRef } from "react";

import { RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

import { useVersionCheck } from "@/hooks/use-version-check";

/**
 * Component that monitors for new application versions and shows a toast
 * notification when a new version is deployed.
 */
export function VersionChecker() {
  const { hasNewVersion, hardRefresh } = useVersionCheck();
  const toastShown = useRef(false);

  useEffect(() => {
    if (hasNewVersion && !toastShown.current) {
      toastShown.current = true;

      toast.info("New version available", {
        description: "Refresh to see the latest changes",
        duration: Infinity,
        action: {
          label: "Refresh",
          onClick: hardRefresh,
        },
        icon: <RefreshCwIcon className="size-4" />,
      });
    }
  }, [hasNewVersion, hardRefresh]);

  return null;
}
