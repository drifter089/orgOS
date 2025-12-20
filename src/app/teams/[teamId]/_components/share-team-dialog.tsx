"use client";

import { useState } from "react";

import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  RefreshCw,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/trpc/react";

interface ShareTeamDialogProps {
  teamId: string;
}

/**
 * Dialog for managing public sharing of a team.
 * Uses a simple fetch → mutate → invalidate pattern for reliable state.
 */
export function ShareTeamDialog({ teamId }: ShareTeamDialogProps) {
  const [open, setOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState<"team" | "dashboard" | null>(
    null,
  );

  const utils = api.useUtils();

  // Fetch fresh data when dialog opens
  const { data: team, isLoading } = api.team.getById.useQuery(
    { id: teamId },
    { enabled: open },
  );

  const setPublicSharingMutation = api.team.setPublicSharing.useMutation({
    onSuccess: (data) => {
      void utils.team.getById.invalidate({ id: teamId });
      toast.success(
        data.isPubliclyShared
          ? "Public sharing enabled - new link generated"
          : "Public sharing disabled - all links invalidated",
      );
    },
    onError: (error) => {
      toast.error("Failed to update sharing settings", {
        description: error.message,
      });
    },
  });

  const regenerateTokenMutation = api.team.regenerateShareToken.useMutation({
    onSuccess: () => {
      void utils.team.getById.invalidate({ id: teamId });
      toast.success("Share links regenerated - old links no longer work");
    },
    onError: (error) => {
      toast.error("Failed to regenerate share links", {
        description: error.message,
      });
    },
  });

  const isMutating =
    setPublicSharingMutation.isPending || regenerateTokenMutation.isPending;

  const isShared = team?.isPubliclyShared ?? false;
  const shareToken = team?.shareToken ?? null;

  const handleToggleSharing = (enabled: boolean) => {
    setPublicSharingMutation.mutate({ teamId, enabled });
  };

  const handleRegenerateToken = () => {
    regenerateTokenMutation.mutate({ teamId });
  };

  const getShareUrl = (type: "team" | "dashboard") => {
    if (typeof window === "undefined" || !shareToken) return "";
    const baseUrl = window.location.origin;
    return `${baseUrl}/public/${type}/${teamId}?token=${shareToken}`;
  };

  const handleCopy = async (type: "team" | "dashboard") => {
    const url = getShareUrl(type);
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(type);
      toast.success(
        `${type === "team" ? "Team canvas" : "Dashboard"} link copied`,
      );
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleOpenPreview = (type: "team" | "dashboard") => {
    const url = getShareUrl(type);
    if (url) {
      window.open(url, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Team</DialogTitle>
          <DialogDescription>
            Share a read-only view of your team canvas and dashboard with
            anyone. Disabling sharing invalidates all existing links.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Toggle */}
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div className="flex items-center gap-3">
                <Link2 className="text-muted-foreground h-5 w-5" />
                <div>
                  <Label htmlFor="share-toggle" className="text-sm font-medium">
                    Public sharing
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Anyone with the link can view
                  </p>
                </div>
              </div>
              <Switch
                id="share-toggle"
                checked={isShared}
                onCheckedChange={handleToggleSharing}
                disabled={isMutating}
              />
            </div>

            {/* Links - only show when sharing is enabled */}
            {isShared && shareToken && (
              <div className="space-y-4">
                {/* Team Canvas Link */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Team Canvas</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={getShareUrl("team")}
                      className="text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="flex-shrink-0"
                      onClick={() => handleCopy("team")}
                      title="Copy link"
                    >
                      {copiedLink === "team" ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="flex-shrink-0"
                      onClick={() => handleOpenPreview("team")}
                      title="Open in new tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Dashboard Link */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Dashboard</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={getShareUrl("dashboard")}
                      className="text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="flex-shrink-0"
                      onClick={() => handleCopy("dashboard")}
                      title="Copy link"
                    >
                      {copiedLink === "dashboard" ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="flex-shrink-0"
                      onClick={() => handleOpenPreview("dashboard")}
                      title="Open in new tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Regenerate Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground w-full"
                  onClick={handleRegenerateToken}
                  disabled={isMutating}
                >
                  {regenerateTokenMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Regenerate share links (invalidates old links)
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
